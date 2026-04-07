import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { StoryBibleEntry, WorldBible, Genre } from '@/lib/types';

export const maxDuration = 60;

/**
 * POST /api/summarize
 *
 * 소설 저장 시 호출. Claude Haiku로 원문을 분석해 두 가지를 반환한다:
 *   - storyBible: 이번 편의 경량 요약 (~80 토큰)
 *   - worldBible: 시리즈 전체 고정 세계관 (isFirstNovel=true일 때만 생성)
 *               isFirstNovel=false이면 worldBible에서 신규 인물만 추출해 반환
 *
 * Body: { novelId, title, content, genre, date, mood, isFirstNovel, existingWorld? }
 */
export async function POST(req: NextRequest) {
  try {
    const {
      novelId,
      title,
      content,
      genre,
      date,
      mood,
      isFirstNovel,
      existingWorld,
    } = await req.json() as {
      novelId: string;
      title: string;
      content: string;
      genre: string;
      date: string;
      mood: string;
      isFirstNovel: boolean;
      existingWorld?: WorldBible;
    };

    if (!novelId || !content) {
      return NextResponse.json({ error: 'novelId와 content는 필수입니다.' }, { status: 400 });
    }

    // ── 프롬프트 분기: 첫 편 vs 후속편 ──────────────────────────────────────
    const systemPrompt = isFirstNovel
      ? buildFirstNovelPrompt()
      : buildSequelPrompt(existingWorld);

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 600,
      system: systemPrompt,
      messages: [{ role: 'user', content: `소설 제목: 「${title}」\n\n${content}` }],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw.replace(/^```json|^```|```$/gm, '').trim());
    } catch {
      parsed = {};
    }

    // ── Story Bible 조립 ─────────────────────────────────────────────────────
    const storyBible: StoryBibleEntry = {
      novelId,
      title,
      date,
      mood,
      ending: (parsed.ending as string) ?? '',
      threads: (parsed.threads as string[]) ?? [],
      newCharacters: (parsed.newCharacters as string[]) ?? [],
    };

    // ── World Bible 조립 ─────────────────────────────────────────────────────
    let worldBible: WorldBible | null = null;

    if (isFirstNovel) {
      // 첫 편: 새 World Bible 생성
      worldBible = {
        genre: genre as Genre,
        worldSetting: (parsed.worldSetting as string) ?? '',
        characters: (parsed.characters as WorldBible['characters']) ?? [],
        rules: (parsed.rules as string[]) ?? [],
        createdAt: date,
      };
    } else if (existingWorld && (parsed.newCharacters as string[])?.length > 0) {
      // 후속편: 신규 인물만 기존 World Bible에 추가
      // (클라이언트의 mergeCharactersIntoWorldBible로 처리하므로 여기선 newCharacterProfiles만 반환)
      worldBible = null; // 클라이언트에서 merge 처리
    }

    return NextResponse.json({ storyBible, worldBible, newCharacterProfiles: parsed.newCharacterProfiles ?? [] });
  } catch (err) {
    console.error('[/api/summarize]', err);
    return NextResponse.json({ error: 'Story Bible 생성 실패' }, { status: 500 });
  }
}

// ─── 첫 편 분석 프롬프트 ─────────────────────────────────────────────────────
// 세계관 전체를 확립하는 World Bible + Story Bible을 함께 생성한다.

function buildFirstNovelPrompt(): string {
  return `당신은 연재 소설 편집장입니다.
주어진 소설을 분석해 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "worldSetting": "주요 배경 한 줄 (장소 + 시대/분위기)",
  "characters": [
    { "name": "이름", "role": "주인공|조력자|라이벌|기타", "traits": "성격·외모·직업 핵심 특징 한 줄" }
  ],
  "rules": ["이 세계의 고유한 규칙이나 설정 (없으면 빈 배열 [])"],
  "ending": "결말 한 줄 요약",
  "threads": ["미해결 복선 또는 열린 결말 요소 (없으면 빈 배열 [])"],
  "newCharacters": ["이름(특징)", ...]
}

- 모든 값은 한국어로 작성
- characters는 소설에 실제로 등장한 인물만 포함
- rules는 이 소설의 세계관을 이해하는 데 필수적인 요소만`;
}

// ─── 후속편 분석 프롬프트 ────────────────────────────────────────────────────
// 기존 세계관은 건드리지 않고, 이번 편의 요약 + 신규 인물만 추출한다.

function buildSequelPrompt(existingWorld?: WorldBible): string {
  const existingNames = existingWorld?.characters.map(c => c.name).join(', ') || '없음';
  return `당신은 연재 소설 편집장입니다.
주어진 소설을 분석해 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

기존 등장인물 (이미 등록됨, 다시 포함하지 말 것): ${existingNames}

{
  "ending": "결말 한 줄 요약",
  "threads": ["미해결 복선 또는 열린 결말 요소 (없으면 빈 배열 [])"],
  "newCharacters": ["이름(특징)", ...],
  "newCharacterProfiles": [
    { "name": "이름", "role": "역할", "traits": "특징 한 줄" }
  ]
}

- newCharacters: 기존 인물 목록에 없는 신규 인물만 포함
- 모든 값은 한국어로 작성`;
}