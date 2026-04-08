import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { StoryBibleEntry, WorldBible, Genre } from '@/lib/types';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const {
      novelId, seriesId, title, content,
      genre, date, mood, isFirstNovel, existingWorld,
    } = await req.json() as {
      novelId: string;
      seriesId: string;
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
    try { parsed = JSON.parse(raw.replace(/^```json|^```|```$/gm, '').trim()); }
    catch { parsed = {}; }

    const storyBible: StoryBibleEntry = {
      novelId, seriesId, title, date, mood,
      ending:        (parsed.ending        as string)   ?? '',
      threads:       (parsed.threads       as string[]) ?? [],
      newCharacters: (parsed.newCharacters as string[]) ?? [],
    };

    let worldBible: WorldBible | null = null;
    if (isFirstNovel) {
      worldBible = {
        seriesId,
        genre: genre as Genre,
        worldSetting: (parsed.worldSetting as string)              ?? '',
        characters:   (parsed.characters   as WorldBible['characters']) ?? [],
        rules:        (parsed.rules        as string[])            ?? [],
        createdAt:    date,
      };
    }

    return NextResponse.json({
      storyBible,
      worldBible,
      newCharacterProfiles: parsed.newCharacterProfiles ?? [],
      suggestedSeriesTitle: isFirstNovel ? ((parsed.seriesTitle as string) || null) : null,
    });
  } catch (err) {
    console.error('[/api/summarize]', err);
    return NextResponse.json({ error: 'Story Bible 생성 실패' }, { status: 500 });
  }
}

function buildFirstNovelPrompt(): string {
  return `당신은 연재 소설 편집장입니다.
주어진 소설을 분석해 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

{
  "seriesTitle": "이 이야기 시리즈의 제목 (10자 이내, 자연스럽고 시적인 한국어, 문장 중간에 끊기지 않게)",
  "worldSetting": "주요 배경 한 줄 (장소 + 시대/분위기)",
  "characters": [
    { "name": "이름", "role": "주인공|조력자|라이벌|기타", "traits": "성격·외모·직업 핵심 특징 한 줄" }
  ],
  "rules": ["세계관 고유 규칙 (없으면 빈 배열 [])"],
  "ending": "결말 한 줄 요약",
  "threads": ["미해결 복선 (없으면 빈 배열 [])"],
  "newCharacters": ["이름(특징)", ...]
}

- 모든 값은 한국어
- characters는 실제 등장 인물만`;
}

function buildSequelPrompt(existingWorld?: WorldBible): string {
  const existingNames = existingWorld?.characters.map(c => c.name).join(', ') || '없음';
  return `당신은 연재 소설 편집장입니다.
주어진 소설을 분석해 아래 JSON 형식으로만 응답하세요. 다른 텍스트는 절대 포함하지 마세요.

기존 등장인물 (재포함 금지): ${existingNames}

{
  "ending": "결말 한 줄 요약",
  "threads": ["미해결 복선 (없으면 빈 배열 [])"],
  "newCharacters": ["이름(특징)", ...],
  "newCharacterProfiles": [
    { "name": "이름", "role": "역할", "traits": "특징 한 줄" }
  ]
}

- newCharacters: 기존 인물에 없는 신규만
- 모든 값은 한국어`;
}