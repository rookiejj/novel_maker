import { NextRequest } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { anthropic } from '@/lib/anthropic';
import { fal } from '@/lib/fal';
import { createClient } from '@/lib/supabase/server';
import {
  buildIllustrationSystemPrompt,
  buildIllustrationUserMessage,
  buildSheetEnrichmentSystemPrompt,
  buildCharacterClause,
} from '@/prompts/illustration';
import type { CharacterSheet, Character, NovelConfig as _NC } from '@/lib/types';
import type { NovelConfig } from '@/lib/types';

export const maxDuration = 300;

const BUCKET = 'novel-illustrations';
const FAL_MODEL = 'fal-ai/flux/dev';

interface FalImage { url: string }
interface FalResult { data: { images: FalImage[] } }

// Storage 업로드 전용 service-role 클라이언트.
// 쿠키 기반 createServerClient로는 storage RLS에 걸리는 경우가 있어,
// RLS를 우회하는 service-role 키로 별도 인스턴스를 만든다.
// user_id 검증은 위쪽 cookie 기반 클라이언트에서 이미 수행하므로,
// 업로드 경로에 {user.id}/ 접두사만 붙이면 안전하다.
// 이 키는 절대 클라이언트로 노출되면 안 된다 (NEXT_PUBLIC_ 접두사 없음).
function getServiceRoleClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되어 있지 않습니다. ' +
      '.env.local 및 Vercel 환경변수에 추가해 주세요.'
    );
  }
  return createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  // ── 인증 가드 ────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return new Response('Unauthorized', { status: 401 });

  // ── 입력 파싱 ────────────────────────────────────────────
  const { novelId } = await req.json() as { novelId?: string };
  if (!novelId) return new Response('novelId는 필수입니다.', { status: 400 });

  // ── 소설 로드 ────────────────────────────────────────────
  const { data: novel, error: loadErr } = await supabase
    .from('novels')
    .select('id, title, content, config, illustration_status')
    .eq('id', novelId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (loadErr || !novel) {
    console.error('[/api/illustration] novel not found', loadErr);
    return new Response('Novel not found', { status: 404 });
  }

  // 이미 생성 완료됐거나 생성 중이면 중복 호출 방지
  if (novel.illustration_status === 'done') {
    return Response.json({ ok: true, skipped: 'already done' });
  }
  if (novel.illustration_status === 'generating') {
    return Response.json({ ok: true, skipped: 'already generating' });
  }

  // ── 상태: generating ────────────────────────────────────
  await supabase
    .from('novels')
    .update({ illustration_status: 'generating' })
    .eq('id', novelId)
    .eq('user_id', user.id);

  try {
    // ── 0. 캐릭터 시트 로드/생성 (시리즈 일관성) ──────────
    const config = novel.config as NovelConfig;
    let characterSheet: CharacterSheet | null = null;
    if (config.seriesId) {
      const { data: seriesRow } = await supabase
        .from('series').select('last_options')
        .eq('id', config.seriesId).eq('user_id', user.id).maybeSingle();
      const lastOpts = (seriesRow?.last_options ?? {}) as { characterSheet?: CharacterSheet };
      characterSheet = lastOpts.characterSheet ?? null;
      if (!characterSheet) {
        characterSheet = createBaseSheet(config);
        const enriched = await enrichSheetFromNovel(characterSheet, novel.content as string);
        if (enriched) characterSheet = enriched;

        // ── 시트 저장: service-role로 직접 update (API route 컨텍스트) ──
        // db.ts 함수는 클라이언트 컴포넌트 전용(쿠키 기반 유저 컨텍스트에 의존)이라
        // API route에서는 uid()가 null을 반환해 silent-fail한다. 따라서 여기서
        // 이미 검증된 user.id와 service-role 키로 직접 업데이트한다.
        try {
          const admin = getServiceRoleClient();
          const { data: seriesRow2 } = await admin.from('series')
            .select('last_options')
            .eq('id', config.seriesId).eq('user_id', user.id).maybeSingle();
          const prev = (seriesRow2?.last_options ?? {}) as Record<string, unknown>;
          const prevSheet = prev.characterSheet as CharacterSheet | undefined;

          // immutable 머지: 기존 시트가 있으면 gender/name/role/pronoun 보존
          let finalSheet = characterSheet;
          if (prevSheet && Array.isArray(prevSheet.characters)) {
            finalSheet = {
              ...characterSheet,
              characters: characterSheet.characters.map(c => {
                const locked = prevSheet.characters.find(
                  p => p.name === c.name || p.role === c.role,
                );
                if (!locked) return c;
                return { ...c, name: locked.name, role: locked.role, gender: locked.gender, pronoun: locked.pronoun };
              }),
            };
          }

          const merged = { ...prev, characterSheet: finalSheet };
          const { error: saveErr, data: updated } = await admin.from('series')
            .update({ last_options: merged })
            .eq('id', config.seriesId).eq('user_id', user.id)
            .select();
          if (saveErr) console.error('[route] character sheet save error:', saveErr);
          // 이후 로직에서 사용하도록 머지된 시트로 교체
          characterSheet = finalSheet;
        } catch (e) {
          console.error('[route] character sheet save exception:', e);
        }
      }
    }
    // ── 1. Claude Haiku로 이미지 프롬프트 생성 ─────────────
    const imagePrompt = await generateImagePrompt({
      title: novel.title as string,
      content: novel.content as string,
      config,
      characterSheet,
    });
    const finalPrompt = imagePrompt + buildCharacterClause(characterSheet);

    // ── 2. Fal.ai로 이미지 생성 ─────────────────────────────
    const falResult = await fal.subscribe(FAL_MODEL, {
      input: {
        prompt: finalPrompt,
        image_size: 'landscape_4_3',
        num_inference_steps: 28,
        guidance_scale: 3.5,
        num_images: 1,
        enable_safety_checker: true,
      },
      logs: false,
    }) as unknown as FalResult;

    const imageUrl = falResult?.data?.images?.[0]?.url;
    if (!imageUrl) throw new Error('Fal.ai가 이미지 URL을 반환하지 않았습니다.');

    // ── 3. 이미지 바이트 다운로드 ────────────────────────────
    const imgRes = await fetch(imageUrl);
    if (!imgRes.ok) throw new Error(`이미지 다운로드 실패: ${imgRes.status}`);
    const contentType = imgRes.headers.get('content-type') ?? 'image/png';
    const ext = contentType.includes('jpeg') ? 'jpg'
             : contentType.includes('webp') ? 'webp'
             : 'png';
    const bytes = new Uint8Array(await imgRes.arrayBuffer());

    // ── 4. Supabase Storage 업로드 (service-role) ─────────────
    // 쿠키 기반 클라이언트는 storage RLS에 걸리므로 service-role 키로 우회한다.
    // user_id 검증은 위의 cookie 기반 supabase로 이미 완료됐다.
    const admin = getServiceRoleClient();
    const path = `${user.id}/${novelId}.${ext}`;
    const { error: uploadErr } = await admin.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType,
        upsert: true,
        cacheControl: '3600',
      });
    if (uploadErr) throw uploadErr;

    // ── 5. public URL 계산 ──────────────────────────────────
    const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(path);
    const publicUrl = pub.publicUrl;

    // ── 6. novels 업데이트: url + status=done ───────────────
    const { error: updErr } = await supabase
      .from('novels')
      .update({
        illustration_url: publicUrl,
        illustration_status: 'done',
      })
      .eq('id', novelId)
      .eq('user_id', user.id);
    if (updErr) throw updErr;

    return Response.json({ ok: true, url: publicUrl });
  } catch (err) {
    console.error('[/api/illustration] failed:', err);
    // 상태를 failed로 되돌려 폴링을 멈추게 한다.
    await supabase
      .from('novels')
      .update({ illustration_status: 'failed' })
      .eq('id', novelId)
      .eq('user_id', user.id);
    return new Response('Illustration generation failed', { status: 500 });
  }
}

// ─── Claude Haiku로 이미지 프롬프트 생성 ──────────────────────
async function generateImagePrompt(params: {
  title: string;
  content: string;
  config: NovelConfig;
  characterSheet?: CharacterSheet | null;
}): Promise<string> {
  const system = buildIllustrationSystemPrompt(
    params.config.genre,
    params.config.illustrationStyle ?? 'anime',
    params.characterSheet,
  );
  const userMsg = buildIllustrationUserMessage(params);

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    system,
    messages: [{ role: 'user', content: userMsg }],
  });

  const textBlock = msg.content.find(b => b.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Haiku가 텍스트를 반환하지 않았습니다.');
  }
  // 혹시 모를 따옴표/마크다운 제거
  return textBlock.text
    .trim()
    .replace(/^["'`]+|["'`]+$/g, '')
    .replace(/^```[a-z]*\n?/i, '')
    .replace(/\n?```$/i, '')
    .trim();
}


function createBaseSheet(config: NovelConfig): CharacterSheet {
  const isBL = config.genre === 'BL';
  const protagGender: 'male' | 'female' =
    isBL ? 'male' : (config.protagonistGender === '여성' ? 'female' : 'male');

  const chars: Character[] = [{
    name: config.protagonistName ?? '주인공',
    role: 'protagonist',
    gender: protagGender,
    pronoun: protagGender === 'male' ? 'he' : 'she',
    ageRange: '20s',
    appearance: protagGender === 'male'
      ? 'young Korean man, short black hair, slim athletic build, calm confident expression'
      : 'young Korean woman, long black hair, slender build, gentle warm expression',
    outfit: 'casual modern clothing, fully dressed, tasteful',
  }];

  if (isBL) {
    chars.push({
      name: '상대역',
      role: 'supporting',
      gender: 'male',
      pronoun: 'he',
      ageRange: '20s',
      appearance: 'young Korean man, medium brown wavy hair, tall build, warm gentle expression',
      outfit: 'smart casual clothing, fully dressed',
    });
  }
  return { characters: chars };
}

async function enrichSheetFromNovel(
  base: CharacterSheet, content: string,
): Promise<CharacterSheet | null> {
  try {
    const system = buildSheetEnrichmentSystemPrompt();
    const userMsg = `# 기존 시트
${JSON.stringify(base, null, 2)}

# 본문
${content.slice(0, 4000)}`;
    const msg = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 1000,
      temperature: 0.2,
      system,
      messages: [{ role: 'user', content: userMsg }],
    });
    const block = msg.content.find(b => b.type === 'text');
    if (!block || block.type !== 'text') {
      return base;
    }
    const match = block.text.match(/\{[\s\S]*\}/);
    if (!match) return base;
    const parsed = JSON.parse(match[0]) as CharacterSheet;
    if (!parsed.characters || !Array.isArray(parsed.characters) || parsed.characters.length === 0) {
      return base;
    }
    // 보강: base의 immutable 필드(gender/name/role/pronoun)로 덮어쓰고 디테일만 merge
    const merged: CharacterSheet = {
      ...parsed,
      characters: base.characters.map(b => {
        const p = parsed.characters.find(c => c.role === b.role) ?? parsed.characters[0];
        return {
          name: b.name,
          role: b.role,
          gender: b.gender,
          pronoun: b.pronoun,
          ageRange: p?.ageRange || b.ageRange,
          appearance: p?.appearance || b.appearance,
          outfit: p?.outfit || b.outfit,
        };
      }),
    };
    return merged;
  } catch (e) {
    console.error('[enrichSheet] error, keeping base:', e);
    return base;
  }
}