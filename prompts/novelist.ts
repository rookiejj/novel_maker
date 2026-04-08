import { NovelConfig, MoodRecord, StoryBibleEntry, WorldBible, MOOD_MAP } from '@/lib/types';

export interface PromptInput {
  config:      NovelConfig;
  recentMoods: MoodRecord[];
}

interface StoryContext {
  currentMoodLabel: string;
  currentMoodEmoji: string;
  moodHistory:      string;
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

function buildContextSection(ctx: StoryContext): string {
  return `
## 오늘의 컨텍스트 (이야기에 반드시 반영할 것)

- 오늘의 기분: **${ctx.currentMoodLabel}** ${ctx.currentMoodEmoji}
- 최근 7일 기분 흐름: ${ctx.moodHistory}

**반영 지침:**
- 주인공의 감정·행동이 오늘 기분(${ctx.currentMoodLabel})과 자연스럽게 일치해야 한다
- "${ctx.currentMoodLabel}"의 감정이 이야기 전반에 배어 있어야 한다 (단순 언급이 아닌 서사에 녹여낼 것)
- 최근 기분 흐름을 참고해 감정의 연속성을 표현한다
`;
}

// ─── 기승전결 내러티브 아크 ───────────────────────────────────────────────────

type Stage = 'intro' | 'rising' | 'climax' | 'resolution' | 'finale';

function getStage(current: number, total: number): Stage {
  if (current >= total) return 'finale';
  const ratio = current / total;
  if (ratio <= 0.25) return 'intro';
  if (ratio <= 0.50) return 'rising';
  if (ratio <= 0.75) return 'climax';
  return 'resolution';
}

const STAGE_LABEL: Record<Stage, string> = {
  intro:      '기 (도입)',
  rising:     '승 (전개)',
  climax:     '전 (위기·전환)',
  resolution: '결 (수렴)',
  finale:     '완결',
};

const STAGE_GUIDE: Record<Stage, string> = {
  intro: `세계관과 인물을 소개하고, 앞으로 이어질 이야기의 씨앗을 심으세요.
복선과 의문점을 남겨 독자의 흥미를 유발하세요.
완결된 느낌보다는 시작의 설렘과 가능성을 담으세요.`,

  rising: `인물들의 관계가 깊어지고 갈등이 고조되는 단계입니다.
새로운 사건이 연쇄적으로 이어지며 이야기에 탄력이 붙어야 합니다.
1편에서 심은 복선들이 슬슬 움직이기 시작해야 합니다.`,

  climax: `갈등이 최고조에 달하는 전환점입니다.
주인공이 중요한 선택이나 위기에 직면해야 합니다.
독자를 놀라게 할 반전이나 폭로가 있어도 좋습니다.
아직 완전히 해소되지 않은 긴장감을 남겨두세요.`,

  resolution: `마무리를 향해 수렴하는 단계입니다.
심어둔 복선들을 하나씩 해소하고, 인물들의 여정이 결론을 향해 모여야 합니다.
급하지 않게, 자연스럽게 마지막 편을 준비하세요.`,

  finale: `이 시리즈의 **마지막 편**입니다.
모든 복선을 빠짐없이 해소하고, 등장인물들의 이야기를 완결지으세요.
독자에게 깊은 여운을 남기는 아름다운 마무리를 써주세요.
"다음 편"을 암시하는 열린 결말은 쓰지 마세요. 이 편으로 완전히 끝납니다.`,
};

function buildNarrativeSection(current: number, total: number): string {
  const stage = getStage(current, total);
  const remaining = total - current;
  const isFinale = stage === 'finale';

  return `
---
## 📖 연재 구조 (반드시 준수)

- 전체 ${total}편 시리즈 / 현재 **${current}/${total}편**
- 남은 편수: ${remaining}편
- 현재 단계: **${STAGE_LABEL[stage]}**
${isFinale ? '\n⚠️ **이번이 마지막 편입니다. 모든 이야기를 완결지어야 합니다.**\n' : ''}

**${STAGE_LABEL[stage]} 작성 지침:**
${STAGE_GUIDE[stage]}
---`;
}

const LENGTH_GUIDE: Record<string, string> = {
  '단편 (500자)':  '500자 내외',
  '중편 (1500자)': '1500자 내외',
  '장편 (3000자)': '3000자 내외',
};

function buildProtagonistSection(name?: string): string {
  if (!name) return '';
  return `\n## 주인공\n- 이름: **${name}** (반드시 이 이름을 사용할 것. 변경·생략 금지)\n`;
}

function buildWorldSection(world: WorldBible): string {
  const characters = world.characters.length > 0
    ? world.characters.map(c => `- ${c.name} (${c.role}): ${c.traits}`).join('\n')
    : '- 아직 등록된 인물 없음';
  const rules = world.rules.length > 0
    ? world.rules.map(r => `- ${r}`).join('\n') : '- 없음';
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
- 인물 이름·성격·역할을 바꾸거나 무시하는 것
- 기존 인물 없이 새 주인공으로 시작하는 것
- 세계관에 맞지 않는 새 배경 도입
---`;
}

function buildContinuitySection(bibles: StoryBibleEntry[], ctx: StoryContext): string {
  if (!bibles?.length) return '';
  const entries = bibles
    .slice(-5)
    .map((b, i) => {
      const lines = [`[${i + 1}편 — 「${b.title}」 (${b.date} / ${b.mood})]`, `결말: ${b.ending}`];
      if (b.threads.length > 0)       lines.push(`미해결 복선: ${b.threads.join(' / ')}`);
      if (b.newCharacters.length > 0) lines.push(`신규 인물: ${b.newCharacters.join(', ')}`);
      return lines.join('\n');
    })
    .join('\n\n');
  const latest = bibles[bibles.length - 1];
  return `
## 이전 이야기 흐름

**새 이야기는 이 흐름의 직접적인 후속편이어야 한다.**

${entries}

**이번 이야기 작성 지침:**
- 전편 「${latest.title}」의 결말(${latest.ending}) 이후를 다룰 것
${latest.threads.length > 0 ? `- 미해결 복선(${latest.threads.join(', ')})을 발전시키거나 해소할 것` : ''}
- 오늘의 기분(${ctx.currentMoodLabel})이 주인공 감정과 분위기에 직접 반영될 것
`;
}

export function buildSystemPrompt({ config, recentMoods }: PromptInput): string {
  const {
    genre, atmosphere, style, length,
    protagonistName, totalEpisodes, currentEpisode,
    worldBible, storyBibles,
  } = config;

  const ctx               = buildContext(recentMoods);
  const contextSection    = buildContextSection(ctx);
  const protagonistSection = buildProtagonistSection(protagonistName);
  const worldSection      = worldBible ? buildWorldSection(worldBible) : '';
  const continuitySection = storyBibles?.length ? buildContinuitySection(storyBibles, ctx) : '';
  const narrativeSection  = (totalEpisodes && currentEpisode)
    ? buildNarrativeSection(currentEpisode, totalEpisodes)
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
${protagonistSection}
${narrativeSection}
${contextSection}
${worldSection}
${continuitySection}
## 출력 형식
- 첫 줄에 소설 제목을 「제목」 형식으로 작성
- 이후 본문을 작성
- 마크다운 헤더(#, ##)는 사용하지 말 것
- 자연스러운 단락 구분(빈 줄)을 사용할 것`;
}