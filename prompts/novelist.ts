import { MoodEntry, NovelOptions, StoryBibleEntry } from '@/lib/types';

export interface PromptInput {
  mood: MoodEntry;
  moodHistory: MoodEntry[];
  options: NovelOptions;
  storyBibles?: StoryBibleEntry[]; // 연속성 유지를 위한 이전 이야기 요약본
}

// ─── Story Bible → 연속성 섹션 ───────────────────────────────────────────────
// 원문이 아닌 경량 요약만 주입 → 편수가 쌓여도 토큰이 폭발하지 않는다.
// 최근 5편 × 편당 ~80 토큰 = 최대 ~400 토큰 고정.

function buildContinuitySection(bibles: StoryBibleEntry[]): string {
  if (!bibles || bibles.length === 0) return '';

  const entries = bibles
    .slice(-5) // 최근 5편만 사용
    .map((b, i) => {
      const lines: string[] = [
        `[${i + 1}편 — 「${b.title}」 (${b.date} / ${b.mood} / ${b.genre})]`,
        `배경: ${b.setting}`,
      ];
      if (b.characters.length > 0) {
        lines.push(`인물: ${b.characters.join(', ')}`);
      }
      lines.push(`결말: ${b.ending}`);
      if (b.threads.length > 0) {
        lines.push(`미해결 복선: ${b.threads.join(' / ')}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');

  return `
---
## 연속성 지침 (반드시 준수)

이 사용자는 지금까지 아래 이야기들을 만들어왔습니다.
새 이야기는 이 흐름을 **파괴하지 않고** 자연스럽게 이어져야 합니다.

**규칙:**
1. 기존 등장인물·장소·사건이 있다면 이를 참조하거나 계승할 것
2. 미해결 복선이나 열린 결말 요소가 있다면 발전시킬 것
3. 완전히 무관한 독립 이야기처럼 쓰지 말 것
4. 오늘의 기분과 선택한 장르·분위기는 반드시 새 이야기에 녹여낼 것
5. 연속성을 유지하되, 매 이야기마다 새로운 사건과 감정 변화를 만들어낼 것

**이전 이야기 요약 (Story Bible):**
${entries}
---
`;
}

// ─── 길이 가이드 ──────────────────────────────────────────────────────────────

const LENGTH_GUIDE: Record<string, string> = {
  '단편 (500자)': '500자 내외',
  '중편 (1500자)': '1500자 내외',
  '장편 (3000자)': '3000자 내외',
};

// ─── 메인 프롬프트 빌더 ───────────────────────────────────────────────────────

export function buildSystemPrompt(input: PromptInput): string {
  const { mood, moodHistory, options, storyBibles } = input;

  const recentMoods = moodHistory
    .slice(0, 7)
    .map(e => `${e.date}: ${e.label}`)
    .join(', ');

  const continuity = buildContinuitySection(storyBibles ?? []);

  return `당신은 섬세하고 감성적인 한국어 단편 소설 작가입니다.
사용자의 오늘 기분과 최근 감정 흐름을 읽어, 그 감정을 담은 단편 소설을 창작합니다.

## 오늘의 기분
- 현재 기분: ${mood.label} (${mood.emoji})
- 최근 7일 기분 흐름: ${recentMoods || '기록 없음'}

## 소설 설정
- 장르: ${options.genre}
- 분위기: ${options.atmosphere}
- 필체: ${options.style}
- 분량: ${LENGTH_GUIDE[options.length] ?? options.length}
${continuity}
## 출력 형식
- 첫 줄에 소설 제목을 「제목」 형식으로 작성
- 이후 본문을 작성
- 마크다운 헤더(#, ##)는 사용하지 말 것
- 자연스러운 단락 구분(빈 줄)을 사용할 것`;
}