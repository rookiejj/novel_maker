import { MoodEntry, NovelOptions, StoryBibleEntry, WorldBible } from '@/lib/types';

export interface PromptInput {
  mood: MoodEntry;
  moodHistory: MoodEntry[];
  options: NovelOptions;
  worldBible?: WorldBible | null;    // 고정 세계관 (첫 편 이후 항상 존재)
  storyBibles?: StoryBibleEntry[];   // 편당 경량 요약 (최근 N편)
}

// ─── World Bible → 고정 세계관 섹션 ──────────────────────────────────────────
// 이 섹션은 매 소설 생성 시 항상 프롬프트에 포함된다.
// Claude에게 "이 시리즈의 불변 헌법"으로 제시한다.

function buildWorldSection(world: WorldBible): string {
  const characters = world.characters
    .map(c => `- ${c.name} (${c.role}): ${c.traits}`)
    .join('\n');

  const rules = world.rules.length > 0
    ? world.rules.map(r => `- ${r}`).join('\n')
    : '- 없음';

  return `
---
## ★ 시리즈 세계관 (절대 변경 불가 — 반드시 준수)

이 이야기는 독립된 단편이 아니라 **하나의 연속 시리즈**입니다.
아래 설정은 시리즈 전체에 걸쳐 고정된 세계관입니다.

**장르:** ${world.genre}
**배경:** ${world.worldSetting}

**등장인물 프로필 (이름·성격·역할을 임의로 바꾸지 말 것):**
${characters || '- 아직 등록된 인물 없음'}

**세계관 규칙:**
${rules}

**금지 사항:**
- 위 인물들의 이름, 성격, 역할을 바꾸거나 무시하는 것
- 위 세계관과 맞지 않는 새로운 배경/설정을 도입하는 것
- 기존 인물을 등장시키지 않고 완전히 새로운 주인공으로 이야기를 시작하는 것
---`;
}

// ─── Story Bible → 이전 이야기 흐름 섹션 ────────────────────────────────────
// 편당 ~80 토큰, 최근 5편만 사용 → 최대 ~400 토큰 고정.

function buildContinuitySection(bibles: StoryBibleEntry[]): string {
  if (!bibles || bibles.length === 0) return '';

  const entries = bibles
    .slice(-5)
    .map((b, i) => {
      const lines: string[] = [
        `[${i + 1}편 — 「${b.title}」 (${b.date} / ${b.mood})]`,
        `결말: ${b.ending}`,
      ];
      if (b.threads.length > 0) {
        lines.push(`미해결 복선: ${b.threads.join(' / ')}`);
      }
      if (b.newCharacters.length > 0) {
        lines.push(`이번 편 신규 인물: ${b.newCharacters.join(', ')}`);
      }
      return lines.join('\n');
    })
    .join('\n\n');

  const latest = bibles[bibles.length - 1];

  return `
## 이전 이야기 흐름

아래는 지금까지의 이야기 요약입니다.
**새 이야기는 반드시 이 흐름의 직접적인 후속편이어야 합니다.**
전편의 결말 상황에서 자연스럽게 이어지세요.

${entries}

**이번 이야기 작성 지침:**
- 전편 「${latest.title}」의 결말(${latest.ending}) 이후를 다룰 것
${latest.threads.length > 0 ? `- 미해결 복선(${latest.threads.join(', ')})을 발전시키거나 해소할 것` : ''}
- 오늘의 기분(${''})이 이야기의 분위기나 사건에 자연스럽게 반영될 것
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
  const { mood, moodHistory, options, worldBible, storyBibles } = input;

  const recentMoods = moodHistory
    .slice(0, 7)
    .map(e => `${e.date}: ${e.label}`)
    .join(', ');

  const isFirstNovel = !worldBible;

  const worldSection = worldBible ? buildWorldSection(worldBible) : '';
  const continuitySection =
    storyBibles && storyBibles.length > 0
      ? buildContinuitySection(storyBibles)
      : '';

  return `당신은 섬세하고 감성적인 한국어 연재 소설 작가입니다.
사용자의 감정 흐름을 바탕으로, 하나의 긴 이야기를 여러 편에 걸쳐 이어가는 연재 소설을 씁니다.
${isFirstNovel ? '\n이번이 시리즈의 **첫 번째 이야기**입니다. 앞으로 이어질 연재의 토대가 될 인물과 세계관을 확립하세요.\n' : ''}
## 오늘의 기분
- 현재 기분: ${mood.label} (${mood.emoji})
- 최근 7일 기분 흐름: ${recentMoods || '기록 없음'}

## 소설 설정
- 장르: ${options.genre}
- 분위기: ${options.atmosphere}
- 필체: ${options.style}
- 분량: ${LENGTH_GUIDE[options.length] ?? options.length}
${worldSection}
${continuitySection}
## 출력 형식
- 첫 줄에 소설 제목을 「제목」 형식으로 작성
- 이후 본문을 작성
- 마크다운 헤더(#, ##)는 사용하지 말 것
- 자연스러운 단락 구분(빈 줄)을 사용할 것`;
}