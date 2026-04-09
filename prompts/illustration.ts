import type { NovelConfig, Genre } from '@/lib/types';
import { GENRE_MAP, ATMOSPHERE_MAP } from '@/lib/types';

/**
 * Claude Haiku에게 "이 소설의 한 장면을 이미지 프롬프트로 만들어줘"라고
 * 지시하는 시스템 프롬프트.
 *
 * Haiku는 최종적으로 "영어 한 줄짜리 Flux 이미지 프롬프트"를 반환해야 한다.
 * 부가 설명이나 따옴표 없이 프롬프트 본문만 출력하도록 강제한다.
 *
 * 장르에 따라 스타일 키워드가 달라진다:
 *   - 동화: 아동 그림책 수채화 톤 (부드럽고 귀여운 질감)
 *   - 그 외: 지브리풍 애니메이션 일러스트 (기존 스타일)
 */
export function buildIllustrationSystemPrompt(genre?: Genre): string {
  const isFairytale = genre === '동화';

  const styleKeywords = isFairytale
    ? '"children\'s picture book illustration, soft watercolor, warm pastel colors, gentle rounded shapes, cozy storybook style, whimsical, dreamy lighting, high quality"'
    : '"anime illustration, cel shading, soft lighting, detailed background, studio ghibli inspired, high quality, 2D"';

  // 동화일 때만 추가되는 제약 블록. 번호를 따로 붙이지 않고 별도 섹션으로
  // 분리해 메인 규칙(1~8)의 연속성을 해치지 않는다.
  const fairytaleBlock = isFairytale
    ? `

# 동화 전용 추가 제약 (매우 중요)
이 작품은 어린 아이(3~8세)를 위한 동화입니다.
- 무서운 장면, 피·상처, 어두운 색조, 불안감을 주는 구도는 절대 쓰지 마세요.
- 장면은 밝고 따뜻하고 포근해야 합니다.
- 말하는 동물이 등장한다면 사랑스럽고 친근한 표정으로 묘사하세요.
- 색감은 파스텔 톤을 기본으로, 자연광(햇살, 달빛, 별빛)이 부드럽게 감도는 분위기로.
- 얼굴은 단순하고 귀엽게 (realistic 얼굴 디테일 금지).`
    : '';

  return `당신은 소설 텍스트를 읽고 그 내용에 가장 어울리는 한 장면을 골라,
텍스트-투-이미지 모델(Flux)용 영어 프롬프트로 변환하는 전문가입니다.

# 규칙
1. 반드시 **영어** 한 줄(80~160 단어 이내)로만 출력합니다.
2. 스타일은 고정입니다: ${styleKeywords}
   이 스타일 키워드를 프롬프트 끝부분에 자연스럽게 포함시키세요.
3. 한 장면만 묘사합니다. 여러 장면을 나열하지 마세요.
4. 인물이 등장한다면 외형(머리색/복장/표정), 자세, 주변 배경, 조명, 시간대, 분위기를 구체적으로 씁니다.
5. 텍스트, 글자, 로고, 워터마크는 포함하지 않습니다 ("no text, no letters" 같은 부정 키워드는 쓰지 마세요 — Flux는 부정 프롬프트를 지원하지 않습니다. 그냥 언급하지 않으면 됩니다).
6. 실사/포토리얼리스틱 키워드는 금지. 반드시 애니메이션/일러스트 스타일로만.
7. 폭력적이거나 선정적인 묘사는 순화해서 은유적으로 표현하세요.
8. **출력은 프롬프트 본문 그 자체만** 포함해야 합니다. 설명, 머리말, 따옴표, 마크다운 금지.${fairytaleBlock}
`;
}

/**
 * 실제 소설 내용과 메타데이터를 담은 user 메시지.
 */
export function buildIllustrationUserMessage(params: {
  title: string;
  content: string;
  config: NovelConfig;
}): string {
  const { title, content, config } = params;
  const genreLabel = GENRE_MAP[config.genre]?.label ?? config.genre;
  const atmosphereLabel = ATMOSPHERE_MAP[config.atmosphere]?.label ?? config.atmosphere;

  // 소설 본문은 너무 길면 토큰 낭비이므로 앞부분 + 중간 + 뒷부분만 샘플링.
  const trimmed = sampleContent(content, 1800);

  return `# 소설 정보
- 제목: ${title}
- 장르: ${genreLabel}
- 분위기: ${atmosphereLabel}

# 본문
${trimmed}

---
위 소설에서 가장 상징적인 한 장면을 골라 영어 Flux 이미지 프롬프트 한 줄로 변환해 주세요.`;
}

/**
 * 소설 본문이 매우 길 경우 앞/중/뒤를 잘라 샘플링.
 */
function sampleContent(content: string, maxLen: number): string {
  if (content.length <= maxLen) return content;
  const chunk = Math.floor(maxLen / 3);
  const head = content.slice(0, chunk);
  const midStart = Math.floor(content.length / 2) - Math.floor(chunk / 2);
  const mid = content.slice(midStart, midStart + chunk);
  const tail = content.slice(-chunk);
  return `${head}\n\n[...중략...]\n\n${mid}\n\n[...중략...]\n\n${tail}`;
}
