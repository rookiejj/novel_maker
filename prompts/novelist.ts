import type { NovelConfig, MoodRecord } from '@/lib/types';
import {
  GENRE_MAP, ATMOSPHERE_MAP, WRITING_STYLE_MAP,
  NOVEL_LENGTH_MAP, MOOD_MAP,
} from '@/lib/types';

const SYSTEM_PROMPT = `당신은 깊이 있는 감수성을 지닌 소설가입니다.
독자의 감정 상태와 취향을 섬세하게 반영하여, 완결성 있는 단편 소설을 씁니다.

[원칙]
- 첫 줄은 반드시 "# 제목" 형식으로 소설 제목을 씁니다.
- 소설 본문은 제목 다음 줄부터 시작합니다.
- 자연스러운 한국어로, 인위적이거나 기계적인 느낌 없이 작성합니다.
- 독자가 몰입할 수 있는 생동감 있는 인물과 장면을 만듭니다.
- 결말은 여운이 남되, 완결성을 갖춥니다.
- 외부 도움 없이 완전한 이야기를 처음부터 끝까지 씁니다.
- 어떤 상황에서도 '소설을 쓰겠습니다', 'AI', '작성합니다' 같은 메타 발언 절대 금지.`;

export function buildNovelPrompt(
  config: NovelConfig,
  recentMoods: MoodRecord[],
): { system: string; user: string } {
  const genre      = GENRE_MAP[config.genre];
  const atmosphere = ATMOSPHERE_MAP[config.atmosphere];
  const style      = WRITING_STYLE_MAP[config.writingStyle];
  const length     = NOVEL_LENGTH_MAP[config.length];

  // Build mood context
  const moodContext = recentMoods.length > 0
    ? recentMoods
        .slice(0, 5)
        .map(r => MOOD_MAP[r.mood].label)
        .join(', ')
    : null;

  const moodInstruction = moodContext
    ? `최근 독자의 감정 흐름: ${moodContext}. 이 감정들이 소설의 내면 정서에 자연스럽게 스며들도록 합니다.`
    : '';

  const user = `
[소설 조건]
장르: ${genre.label}
분위기: ${atmosphere.label}
필체: ${style.label} — ${style.desc}
분량: ${length.label} (${length.desc})
${moodInstruction}

위 조건에 맞는 소설을 지금 바로 써주세요.
`.trim();

  return { system: SYSTEM_PROMPT, user };
}