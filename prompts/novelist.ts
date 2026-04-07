import { NovelConfig, MoodRecord, StoryBibleEntry, WorldBible, MOOD_MAP } from '@/lib/types';

export interface PromptInput {
  config: NovelConfig;
  recentMoods: MoodRecord[];
}

const LENGTH_GUIDE: Record<string, string> = {
  '단편 (500자)':   '500자 내외',
  '중편 (1500자)':  '1500자 내외',
  '장편 (3000자)':  '3000자 내외',
};

// ─── World Bible 섹션 ─────────────────────────────────────────────────────────

function buildWorldSection(world: WorldBible): string {
  const characters = world.characters.length > 0
    ? world.characters.map(c => `- ${c.name} (${c.role}): ${c.traits}`).join('\n')
    : '- 아직 등록된 인물 없음';
  const rules = world.rules.length > 0
    ? world.rules.map(r => `- ${r}`).join('\n')
    : '- 없음';

  return `
---
## ★ 시리즈 세계관 (절대 변경 불가 — 반드시 준수)

이 이야기는 독립 단편이 아니라 **하나의 연속 시리즈**입니다.
아래 설정은 시리즈 전체에 고정된 세계관입니다.

**장르:** ${world.genre}
**배경:** ${world.worldSetting}

**등장인물 프로필 (이름·성격·역할을 임의로 바꾸지 말 것):**
${characters}

**세계관 규칙:**
${rules}

**금지 사항:**
- 위 인물의 이름·성격·역할을 바꾸거나 무시하는 것
- 세계관과 맞지 않는 새 배경·설정을 도입하는 것
- 기존 인물 없이 완전히 새 주인공으로 이야기를 시작하는 것
---`;
}

// ─── Story Bible 섹션 ────────────────────────────────────────────────────────
// 편당 ~80 토큰, 최근 5편 → 최대 ~400 토큰 고정

function buildContinuitySection(bibles: StoryBibleEntry[], currentMoodLabel: string): string {
  if (!bibles || bibles.length === 0) return '';

  const entries = bibles
    .slice(-5)
    .map((b, i) => {
      const lines = [
        `[${i + 1}편 — 「${b.title}」 (${b.date} / ${b.mood})]`,
        `결말: ${b.ending}`,
      ];
      if (b.threads.length > 0) lines.push(`미해결 복선: ${b.threads.join(' / ')}`);
      if (b.newCharacters.length > 0) lines.push(`신규 인물: ${b.newCharacters.join(', ')}`);
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
- 오늘의 기분(${currentMoodLabel})이 이야기 분위기나 사건에 자연스럽게 반영될 것
`;
}

// ─── 메인 프롬프트 빌더 ───────────────────────────────────────────────────────

export function buildSystemPrompt({ config, recentMoods }: PromptInput): string {
  const { genre, atmosphere, style, length, worldBible, storyBibles } = config;

  const baseMood    = recentMoods[0];
  const moodLabel   = baseMood ? MOOD_MAP[baseMood.mood].label : '';
  const moodEmoji   = baseMood ? MOOD_MAP[baseMood.mood].emoji : '';
  const moodHistory = recentMoods
    .slice(0, 7)
    .map(r => `${r.date}: ${MOOD_MAP[r.mood].label}`)
    .join(', ');

  const isFirstNovel    = !worldBible;
  const worldSection    = worldBible ? buildWorldSection(worldBible) : '';
  const continuitySection = storyBibles?.length
    ? buildContinuitySection(storyBibles, moodLabel)
    : '';

  return `당신은 섬세하고 감성적인 한국어 연재 소설 작가입니다.
사용자의 감정 흐름을 바탕으로, 하나의 긴 이야기를 여러 편에 걸쳐 이어가는 연재 소설을 씁니다.
${isFirstNovel ? '\n이번이 시리즈의 **첫 번째 이야기**입니다. 앞으로 이어질 연재의 토대가 될 인물과 세계관을 확립하세요.\n' : ''}
## 오늘의 기분
- 현재 기분: ${moodLabel} ${moodEmoji}
- 최근 7일 기분 흐름: ${moodHistory || '기록 없음'}

## 소설 설정
- 장르: ${genre}
- 분위기: ${atmosphere}
- 필체: ${style}
- 분량: ${LENGTH_GUIDE[length] ?? length}
${worldSection}
${continuitySection}
## 출력 형식
- 첫 줄에 소설 제목을 「제목」 형식으로 작성
- 이후 본문을 작성
- 마크다운 헤더(#, ##)는 사용하지 말 것
- 자연스러운 단락 구분(빈 줄)을 사용할 것`;
}