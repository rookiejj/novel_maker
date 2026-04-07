import { NextRequest, NextResponse } from 'next/server';
import { anthropic } from '@/lib/anthropic';
import { StoryBibleEntry, Genre } from '@/lib/types';

export const maxDuration = 60;

/**
 * POST /api/summarize
 *
 * 소설 저장 시 호출. 원문을 Claude Haiku로 분석해 StoryBibleEntry(경량 요약)를 반환한다.
 * 이 요약본만 localStorage에 보관하고, 이후 소설 생성 시 원문 대신 주입한다.
 *
 * Body: { novelId, title, content, genre, date, mood }
 * Response: StoryBibleEntry (JSON)
 */
export async function POST(req: NextRequest) {
  try {
    const { novelId, title, content, genre, date, mood } = await req.json() as {
      novelId: string;
      title: string;
      content: string;
      genre: string;
      date: string;
      mood: string;
    };

    if (!novelId || !content) {
      return NextResponse.json({ error: 'novelId와 content는 필수입니다.' }, { status: 400 });
    }

    // Haiku 사용: 빠르고 저렴하게 구조화된 요약 생성
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 512,
      system: `당신은 소설 분석 전문가입니다.
주어진 소설을 분석해 아래 JSON 형식으로만 응답하세요.
코드 블록, 설명, 기타 텍스트는 절대 포함하지 마세요. 오직 JSON만 출력하세요.

형식:
{
  "characters": ["이름(특징 또는 관계)", ...],
  "setting": "주요 배경 한 줄 (장소 + 시대/분위기)",
  "ending": "결말 한 줄 요약",
  "threads": ["미해결 복선 또는 열린 결말 요소", ...]
}

- characters: 등장인물이 없으면 []
- threads: 복선이 없으면 []
- 모든 값은 한국어로 작성`,
      messages: [
        {
          role: 'user',
          content: `다음 소설을 분석해주세요:\n\n${content}`,
        },
      ],
    });

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : '{}';

    let parsed: { characters?: string[]; setting?: string; ending?: string; threads?: string[] };
    try {
      parsed = JSON.parse(raw.replace(/^```json|^```|```$/gm, '').trim());
    } catch {
      parsed = { characters: [], setting: '', ending: '', threads: [] };
    }

    const bible: StoryBibleEntry = {
      novelId,
      title,
      date,
      genre: genre as Genre,
      mood,
      characters: parsed.characters ?? [],
      setting: parsed.setting ?? '',
      ending: parsed.ending ?? '',
      threads: parsed.threads ?? [],
    };

    return NextResponse.json(bible);
  } catch (err) {
    console.error('[/api/summarize]', err);
    return NextResponse.json({ error: 'Story Bible 생성 실패' }, { status: 500 });
  }
}
