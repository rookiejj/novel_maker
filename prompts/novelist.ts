import { NovelConfig, MoodRecord, StoryBibleEntry, WorldBible, MOOD_MAP } from '@/lib/types';

export interface PromptInput {
  config:      NovelConfig;
  recentMoods: MoodRecord[];
}

/**
 * StoryContext — 소설에 영향을 주는 모든 요소를 한 곳에 모아 관리한다.
 * 현재는 mood만 있지만, 추후 날씨/계절/특별한 날 등을 여기에 추가하면
 * buildContextSection() 하나만 수정하면 된다.
 */
interface StoryContext {
  // ── 현재 구현된 요소 ──────────────────────────────────────────────────────
  currentMoodLabel: string;  // 예: "슬퍼"
  currentMoodEmoji: string;  // 예: "😢"
  moodHistory: string;       // 예: "2024-01-01: 행복해, 2024-01-02: 슬퍼"

  // ── 추후 추가 예정 (타입만 선언해 두어 IDE 자동완성 활용) ──────────────────
  // season?: string;          // 계절
  // weather?: string;         // 날씨
  // specialDay?: string;      // 기념일 / 생일 등
  // timeOfDay?: string;       // 아침 / 밤 등
  // recentEvent?: string;     // 최근 사용자 메모
}

function buildContext(recentMoods: MoodRecord[]): StoryContext {
  const base = recentMoods[0];
  return {
    currentMoodLabel: base ? MOOD_MAP[base.mood].label : '알 수 없음',
    currentMoodEmoji: base ? MOOD_MAP[base.mood].emoji : '',
    moodHistory: recentMoods
      .slice(0, 7)
      .map(r => `${r.date}: ${MOOD_MAP[r.mood].label}`)
      .join(', ') || '기록 없음',
  };
}

/**
 * buildContextSection — StoryContext를 프롬프트 텍스트로 변환.
 * 새 요소 추가 시 이 함수에만 추가하면 된다.
 */
function buildContextSection(ctx: StoryContext): string {
  const lines = [
    `- 오늘의 기분: ${ctx.currentMoodLabel} ${ctx.currentMoodEmoji}`,
    `- 최근 7일 기분 흐름: ${ctx.moodHistory}`,
    // 추후 추가 예:
    // ctx.season    ? `- 계절: ${ctx.season}` : null,
    // ctx.weather   ? `- 날씨: ${ctx.weather}` : null,
    // ctx.specialDay? `- 오늘은: ${ctx.specialDay}` : null,
  ].filter(Boolean).join('\n');

  return `
## 오늘의 컨텍스트 (이야기에 반드시 반영할 것)

${lines}

**반영 지침:**
- 주인공의 내면 감정이나 행동이 오늘의 기분(${ctx.currentMoodLabel})과 일치해야 한다
- 기분이 "슬퍼"라면 이야기 전체에 그 감정이 배어 있어야 하고, "설레"라면 두근거림이 느껴져야 한다
- 최근 7일의 기분 흐름을 참고해 감정의 연속성을 표현한다 (갑자기 기분이 달라지면 그 이유가 이야기 속에 드러나야 한다)
`;
}

const LENGTH_GUIDE: Record<string, string> = {
  '단편 (500자)':  '500자 내외',
  '중편 (1500자)': '1500자 내외',
  '장편 (3000자)': '3000자 내외',
};

function buildWorldSection(world: WorldBible): string {
  const characters = world.characters.length > 0
    ? world.characters.map(c => `- ${c.name} (${c.role}): ${c.traits}`).join('\n')
    : '- 아직 등록된 인물 없음';
  const rules = world.rules.length > 0
    ? world.rules.map(r => `- ${r}`).join('\n')
    : '- 없음';

  return `
---
## ★ 시리즈 세계관 (절대 변경 불가)

**장르:** ${world.genre}
**배경:** ${world.worldSetting}

**등장인물 (이름·성격·역할 변경 금지):**
${characters}

**세계관 규칙:**
${rules}

**금지 사항:**
- 인물의 이름·성격·역할을 바꾸거나 무시하는 것
- 기존 인물 없이 새 주인공으로 시작하는 것
- 세계관과 맞지 않는 새 배경을 도입하는 것
---`;
}

function buildContinuitySection(bibles: StoryBibleEntry[], ctx: StoryContext): string {
  if (!bibles || bibles.length === 0) return '';

  const entries = bibles
    .slice(-5)
    .map((b, i) => {
      const lines = [
        `[${i + 1}편 — 「${b.title}」 (${b.date} / ${b.mood})]`,
        `결말: ${b.ending}`,
      ];
      if (b.threads.length > 0)      lines.push(`미해결 복선: ${b.threads.join(' / ')}`);
      if (b.newCharacters.length > 0) lines.push(`신규 인물: ${b.newCharacters.join(', ')}`);
      return lines.join('\n');
    })
    .join('\n\n');

  const latest = bibles[bibles.length - 1];

  return `
## 이전 이야기 흐름

**새 이야기는 반드시 이 흐름의 직접적인 후속편이어야 한다.**

${entries}

**이번 이야기 작성 지침:**
- 전편 「${latest.title}」의 결말(${latest.ending}) 이후를 다룰 것
${latest.threads.length > 0 ? `- 미해결 복선(${latest.threads.join(', ')})을 발전시키거나 해소할 것` : ''}
- 오늘의 기분(${ctx.currentMoodLabel})이 이야기 분위기와 주인공의 감정에 직접 반영될 것
`;
}

export function buildSystemPrompt({ config, recentMoods }: PromptInput): string {
  const { genre, atmosphere, style, length, worldBible, storyBibles } = config;

  const ctx               = buildContext(recentMoods);
  const contextSection    = buildContextSection(ctx);
  const worldSection      = worldBible ? buildWorldSection(worldBible) : '';
  const continuitySection = storyBibles?.length
    ? buildContinuitySection(storyBibles, ctx)
    : '';
  const isFirstNovel = !worldBible;

  return `당신은 섬세하고 감성적인 한국어 연재 소설 작가입니다.
사용자의 감정 흐름을 바탕으로, 하나의 긴 이야기를 여러 편에 걸쳐 이어가는 연재 소설을 씁니다.
${isFirstNovel ? '\n이번이 시리즈의 **첫 번째 이야기**입니다. 앞으로 이어질 연재의 토대가 될 인물과 세계관을 확립하세요.\n' : ''}
## 소설 설정
- 장르: ${genre}
- 분위기: ${atmosphere}
- 필체: ${style}
- 분량: ${LENGTH_GUIDE[length] ?? length}
${contextSection}
${worldSection}
${continuitySection}
## 출력 형식
- 첫 줄에 소설 제목을 「제목」 형식으로 작성
- 이후 본문을 작성
- 마크다운 헤더(#, ##)는 사용하지 말 것
- 자연스러운 단락 구분(빈 줄)을 사용할 것`;
}