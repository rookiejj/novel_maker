import { NextRequest } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { fal } from '@/lib/fal';
import { createClient } from '@/lib/supabase/server';
import {
  buildIllustrationSystemPrompt,
  buildIllustrationUserMessage,
} from '@/prompts/illustration';
import type { NovelConfig } from '@/lib/types';

export const maxDuration = 300;

const BUCKET = 'novel-illustrations';
const FAL_MODEL = 'fal-ai/flux/schnell';

interface FalImage { url: string }
interface FalResult { data: { images: FalImage[] } }

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
    // ── 1. Claude Haiku로 이미지 프롬프트 생성 ─────────────
    const imagePrompt = await generateImagePrompt({
      title: novel.title as string,
      content: novel.content as string,
      config: novel.config as NovelConfig,
    });
    console.log('[/api/illustration] image prompt:', imagePrompt);

    // ── 2. Fal.ai로 이미지 생성 ─────────────────────────────
    const falResult = await fal.subscribe(FAL_MODEL, {
      input: {
        prompt: imagePrompt,
        image_size: 'landscape_4_3',
        num_inference_steps: 4,
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

    // ── 4. Supabase Storage 업로드 ──────────────────────────
    const path = `${user.id}/${novelId}.${ext}`;
    const { error: uploadErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, bytes, {
        contentType,
        upsert: true,
        cacheControl: '3600',
      });
    if (uploadErr) throw uploadErr;

    // ── 5. public URL 계산 ──────────────────────────────────
    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
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
}): Promise<string> {
  const system = buildIllustrationSystemPrompt();
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
