import { NovelConfig, MoodRecord, StoryBibleEntry, WorldBible, MOOD_MAP, WEATHER_MAP } from '@/lib/types';

export interface PromptInput {
  config:      NovelConfig;
  recentMoods: MoodRecord[];
}

interface StoryContext {
  currentMoodLabel: string;
  currentMoodEmoji: string;
  moodHistory:      string;
  weather?:         string;
  weatherEmoji?:    string;
  weatherEffect?:   string;
}

function buildContext(recentMoods: MoodRecord[], weatherInfo?: { label: string; emoji: string; effect: string }): StoryContext {
  const base = recentMoods[0];
  return {
    currentMoodLabel: base ? MOOD_MAP[base.mood].label : '알 수 없음',
    currentMoodEmoji: base ? MOOD_MAP[base.mood].emoji : '',
    moodHistory: recentMoods
      .slice(0, 7)
      .map(r => `${r.date}: ${MOOD_MAP[r.mood].label}`)
      .join(', ') || '기록 없음',
    weather:       weatherInfo?.label,
    weatherEmoji:  weatherInfo?.emoji,
    weatherEffect: weatherInfo?.effect,
  };
}

function buildContextSection(ctx: StoryContext): string {
  const weatherNote = ctx.weather ? ` / 날씨: ${ctx.weather}` : '';

  return `
## 오늘의 컨텍스트 (참고용)

오늘 기분: ${ctx.currentMoodLabel} ${ctx.currentMoodEmoji}${weatherNote}
최근 흐름: ${ctx.moodHistory}
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

// 동화 전용 기승전결 지침 — 일반 소설과 어조가 완전히 다르다.
// "갈등 고조", "위기", "반전" 같은 표현을 쓰면 작가 AI가 자극적으로 흐른다.
// 동화는 "작은 문제 → 작은 해결"의 따뜻한 리듬을 유지해야 한다.
const FAIRYTALE_STAGE_GUIDE: Record<Stage, string> = {
  intro: `주인공과 친구들, 그리고 그들이 사는 포근한 동네나 숲을 아이에게 소개하세요.
주인공이 누구인지, 무엇을 좋아하는지, 오늘 어떤 작은 호기심이 생겼는지 보여주세요.
앞으로 이어질 모험의 첫 설렘을 담되, 무섭거나 불안한 느낌은 전혀 없어야 합니다.`,

  rising: `주인공이 새로운 친구를 만나거나 작은 궁금증을 따라가기 시작합니다.
말하는 동물, 반짝이는 나뭇잎, 웃는 구름 같은 따뜻한 신비를 하나씩 소개하세요.
아주 작은 문제(길을 잃었거나, 친구가 울고 있거나)가 살짝 등장해도 좋지만 위협적이면 안 됩니다.`,

  climax: `주인공이 작은 용기를 내어 친구를 돕거나 문제를 해결하려고 합니다.
"위기"가 아니라 "조금 어려운 순간"입니다. 주인공이 혼자가 아니라는 걸,
친구들과 함께라면 해낼 수 있다는 걸 보여주세요. 무서운 장면, 싸움, 울음이
길게 이어지는 장면은 쓰지 마세요. 따뜻한 깨달음의 순간을 준비하세요.`,

  resolution: `문제가 부드럽게 풀리고, 주인공과 친구들이 서로를 안아주거나 웃는 장면으로
이어지세요. 오늘 있었던 일에서 아이가 가져갈 수 있는 작은 교훈
(친구의 소중함, 용기, 나눔, 정직, 호기심의 즐거움 등)이 자연스럽게 녹아들어야 합니다.
교훈을 설교하지는 마세요. 행동과 감정으로 보여주세요.`,

  finale: `이 시리즈의 **마지막 편**입니다.
주인공이 지금까지 만난 모든 친구들과 함께 가장 따뜻한 순간을 맞이하게 해주세요.
모두가 행복해지는 결말로 끝나야 합니다. 포옹, 축제, 잠들기 전의 다정한 인사 같은
장면이 어울립니다. "오래오래 행복하게 살았답니다" 같은 전통 동화의 마무리도 좋습니다.
열린 결말이나 슬픈 여운은 쓰지 마세요. 아이가 미소 지으며 잠들 수 있는 완결을 써주세요.`,
};

function buildNarrativeSection(current: number, total: number, genre: string): string {
  const stage = getStage(current, total);
  const remaining = total - current;
  const isFinale = stage === 'finale';
  const guide = genre === '동화' ? FAIRYTALE_STAGE_GUIDE[stage] : STAGE_GUIDE[stage];

  return `
---
## 📖 연재 구조 (반드시 준수)

- 전체 ${total}편 시리즈 / 현재 **${current}/${total}편**
- 남은 편수: ${remaining}편
- 현재 단계: **${STAGE_LABEL[stage]}**
${isFinale ? '\n⚠️ **이번이 마지막 편입니다. 모든 이야기를 완결지어야 합니다.**\n' : ''}

**${STAGE_LABEL[stage]} 작성 지침:**
${guide}
---`;
}

const LENGTH_GUIDE: Record<string, string> = {
  '단편 (500자)':  '500자 내외',
  '중편 (1500자)': '1500자 내외',
  '장편 (3000자)': '3000자 내외',
};

function buildProtagonistSection(name?: string, gender?: string): string {
  if (!name && !gender) return '';
  const lines: string[] = [];
  if (name)   lines.push(`- 이름: **${name}** (반드시 이 이름을 사용할 것. 변경·생략 금지)`);
  if (gender) lines.push(`- 성별: **${gender}** (대명사·묘사에 일관되게 반영할 것)`);
  return `\n## 주인공\n${lines.join('\n')}\n`;
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



const NARRATIVE_DEVICES = [
  '주인공이 방금 중요한 거짓말을 한 직후 장면에서 시작할 것',
  '이야기가 이미 끝난 것처럼 회고하는 목소리로 시작했다가 현재로 끌려오게 할 것',
  '독자에게 직접 말을 걸며 시작하되, 도중에 그 시선을 거둘 것',
  '전혀 관계없어 보이는 두 장면을 교차하다가 연결점을 드러낼 것',
  '누군가의 대화를 엿듣는 것으로 시작하되, 엿듣는 사람의 오해를 중심에 놓을 것',
  '아무도 중요하게 여기지 않는 사물 하나의 시선으로 이야기를 열 것',
  '주인공이 틀린 결정을 내리는 순간으로 시작하되, 그게 틀렸다는 걸 독자만 알게 할 것',
  '시간 순서를 뒤집어 결과를 먼저 보여준 뒤 원인을 향해 역행할 것',
  '일상적인 장면 한가운데 전혀 어울리지 않는 디테일을 하나 심어 불안감을 만들 것',
  '주인공이 아닌 주변 인물의 짧은 내면으로 이야기를 열었다가 주인공에게 넘길 것',
  '무언가가 이미 돌이킬 수 없이 변해버린 세계에서 시작할 것',
  '대화 없이 오직 행동의 연속으로만 첫 장면을 구성할 것',
  '독자가 이미 알고 있다고 착각하게 만들었다가 반전을 줄 것',
  '가장 사소한 선택이 이야기 전체를 움직이는 첫 번째 도미노가 되게 할 것',
  '침묵과 말해지지 않은 것들로만 이루어진 장면으로 시작할 것',
];

// 동화 전용 서사 장치 풀.
// 위의 일반 NARRATIVE_DEVICES는 "거짓말", "불안감", "반전" 등 아이에게
// 맞지 않는 요소가 많다. 동화는 따뜻하고 단순하게 시작해야 한다.
const FAIRYTALE_NARRATIVE_DEVICES = [
  '"옛날 옛적에" 혹은 "깊은 숲속 작은 집에"로 시작하는 전통 동화의 리듬으로 열 것',
  '주인공이 아침에 눈을 뜨자마자 창문 밖에서 나는 신기한 소리를 따라가며 시작할 것',
  '작은 동물 친구가 주인공을 부르는 인사말로 이야기를 열 것',
  '반짝반짝, 살랑살랑, 폴짝폴짝 같은 의성어·의태어로 첫 장면의 공기를 그릴 것',
  '주인공이 오늘 처음 발견한 작은 선물(이슬방울, 도토리, 떨어진 깃털)로 시작할 것',
  '바람이 가져온 편지나 낯선 노랫소리에 이끌려 모험이 시작될 것',
  '주인공이 엄마 아빠에게 "다녀올게요!" 하고 인사하며 집을 나서는 장면으로 시작할 것',
  '"~하고 ~하고 ~하던 어느 날"처럼 반복 리듬으로 평온한 일상을 먼저 보여주고 변화를 살짝 꺼낼 것',
  '주인공이 낮잠에서 깨어 보니 곁에 낯선 작은 친구가 앉아 있는 장면으로 시작할 것',
  '달빛이 내려앉은 밤, 숲의 나무들이 속삭이기 시작하는 장면으로 열 것',
  '주인공이 가장 좋아하는 놀이를 하다가 작은 비밀을 발견하는 순간으로 시작할 것',
  '무지개 끝이나 구름 위에서 내려온 친구를 맞이하며 시작할 것',
];

const WRITER_PERSONA: Record<string, string> = {
  '로맨스':   '설렘과 감정의 결을 섬세하게 포착하는 한국어 로맨스 소설 작가',
  'BL':       '두 남성 인물 사이의 섬세한 감정선과 관계의 긴장을 품격 있게 그려내는 한국어 BL(Boys Love) 소설 작가',
  'SF':       '인간과 기술, 미래의 경계를 탐구하는 한국어 SF 소설 작가',
  '판타지':   '상상력 넘치는 세계와 인물을 생생하게 구현하는 한국어 판타지 소설 작가',
  '공포':     '독자의 등골을 서늘하게 만드는 긴장감과 불안을 조율하는 한국어 공포 소설 작가',
  '미스터리': '복선과 반전을 치밀하게 설계하는 한국어 미스터리 소설 작가',
  '일상':     '평범한 하루 속 작은 감동을 포착하는 따뜻한 한국어 일상 소설 작가',
  '성장':     '인물의 내면 변화와 깨달음을 진솔하게 그려내는 한국어 성장 소설 작가',
  '역사':     '시대의 공기와 인물의 숨결을 되살리는 한국어 역사 소설 작가',
  '동화':     '아이가 잠들기 전에 부모가 읽어주는 따뜻한 한국어 동화 작가',
};

// ─── 동화 전용 추가 지침 ─────────────────────────────────────────────────
//
// 동화는 일반 소설과 타깃·톤·어휘·갈등 수위가 전혀 다르기 때문에, 시스템
// 프롬프트의 "창작 지침" 블록에 이 내용이 통째로 들어가야 한다.
// (다른 장르에는 주입되지 않음)
const BL_GUIDELINES = `
## BL 장르 작성 지침 (매우 중요)

- 두 남성 주인공의 감정선·관계 발전·내적 갈등을 이야기 중심에 둔다.
- 첫 만남의 떨림, 오해, 질투, 화해 같은 로맨스 요소를 적극 활용하되 진부하지 않게 변주한다.
- 신체 묘사는 감정의 흐름을 보조하는 선에서 절제된 언어로 표현한다 (시선, 손끝, 호흡, 체온 등).
- 노골적인 성행위 묘사는 지양하고, 여운과 암시로 처리한다.
- 동성 관계에 대한 자기 수용·주변의 시선 같은 주제를 자연스럽게 녹일 수 있다.
- 두 인물의 직업·배경·성격 차이에서 오는 케미스트리를 적극적으로 살린다.
`;

const FAIRYTALE_GUIDELINES = `
## 동화 작성 지침 (매우 중요)

이 이야기는 **아주 어린 아이(3~8세)가 잠들기 전에 부모가 읽어주는 동화**입니다.
아이가 듣고 눈을 반짝이며 "더 읽어줘"라고 말할 수 있도록, 또 부모가 아이에게
안심하고 읽어줄 수 있도록 써야 합니다.

### 필수 원칙

1. **따뜻함과 안심** — 무서운 장면, 폭력, 죽음, 어두운 상실, 긴 이별은 절대 쓰지
   마세요. "어려운 순간"은 있어도 항상 친구와 함께 극복하고, 결말은 언제나
   포근하고 행복해야 합니다.

2. **말하는 동물과 살아 있는 자연** — 토끼, 다람쥐, 곰, 고양이, 작은 새, 여우
   같은 동물 친구들이 주인공과 자연스럽게 **말을 나눕니다**. 나무, 꽃, 바람,
   별, 달, 구름도 마음을 가지고 있고 주인공을 도와줄 수 있습니다. 이 세계에서는
   그것이 당연한 일입니다.

3. **아이가 이해할 수 있는 쉬운 어휘** — 한자어, 추상어, 성인용 은유는 쓰지
   마세요. "갈등", "고뇌", "모순", "존재", "의문" 같은 단어 금지. 대신 "속상해",
   "궁금해", "두근두근", "폴짝폴짝", "반짝반짝" 같은 아이의 말로 쓰세요.

4. **의성어·의태어를 풍부하게** — 바람은 "솔솔", 발자국은 "뽀드득", 웃음은
   "까르르", 심장은 "두근두근", 빗방울은 "톡톡". 문장에 리듬감이 살아야 합니다.

5. **반복과 리듬** — "~하고 ~하고 ~했어요" 같은 전통 동화의 반복 구조를 활용
   하세요. 세 번의 만남, 세 개의 선물, 세 마디 주문 같은 3의 리듬이 좋습니다.
   아이는 반복을 통해 이야기에 빠져듭니다.

6. **존댓말 문체** — 부모가 아이에게 읽어주는 목소리이므로, 해요체("~했어요",
   "~랍니다", "~이에요")로 부드럽게 쓰세요. 반말이나 건조한 서술은 쓰지 마세요.

7. **작은 교훈은 행동으로** — 친구의 소중함, 나눔, 용기, 정직, 호기심, 배려 같은
   가치가 자연스럽게 담겨야 합니다. 하지만 "~하는 것이 중요해요"처럼 직접
   설교하지는 마세요. 주인공의 행동과 결과로 아이가 스스로 느끼게 하세요.

8. **감각적이고 사랑스러운 묘사** — 꽃잎의 색, 구름의 모양, 이슬의 반짝임,
   따뜻한 털의 감촉, 달콤한 냄새 같은 구체적이고 기분 좋은 감각을 풍부하게
   써주세요. 아이의 상상력을 자극하는 그림이 떠올라야 합니다.

9. **주인공의 이름과 친구들** — 부르기 쉽고 귀여운 이름을 쓰세요 (예: 토토,
   뽀송이, 반짝이, 노랑이, 포포, 루루). 이미 주인공 이름이 지정되어 있으면
   그 이름을 그대로 쓰되, 새로 등장하는 동물 친구에게는 이런 이름을 붙여
   주세요.

10. **절대 금지 사항**
    - 죽음, 살인, 피, 상처, 고문
    - 악당이 영구히 승리하거나 주인공이 실패하는 결말
    - 부모의 부재나 버림받음을 강조하는 장면
    - 성적 암시나 로맨틱한 긴장
    - 정치·종교·철학적 논쟁
    - 공포·불안·절망의 감정을 오래 끌고 가는 장면
    - 아이가 따라하면 위험한 행동 묘사
`;

export function buildSystemPrompt({ config, recentMoods }: PromptInput): string {
  const {
    genre, atmosphere, style, length,
    protagonistName, protagonistGender, weather: weatherType, totalEpisodes, currentEpisode,
    worldBible, storyBibles,
  } = config;

  const weatherInfo = weatherType && WEATHER_MAP[weatherType as keyof typeof WEATHER_MAP]
    ? WEATHER_MAP[weatherType as keyof typeof WEATHER_MAP]
    : undefined;
  const ctx               = buildContext(recentMoods, weatherInfo);
  const contextSection    = buildContextSection(ctx);
  const protagonistSection = buildProtagonistSection(protagonistName, protagonistGender);
  const worldSection      = worldBible ? buildWorldSection(worldBible) : '';
  const continuitySection = storyBibles?.length ? buildContinuitySection(storyBibles, ctx) : '';
  const narrativeSection  = (totalEpisodes && currentEpisode)
    ? buildNarrativeSection(currentEpisode, totalEpisodes, genre)
    : '';
  const isFirstNovel = !worldBible;

  const isFairytale = genre === '동화';
  const persona = WRITER_PERSONA[genre] ?? '한국어 연재 소설 작가';

  // 동화와 일반 소설은 서로 다른 서사 장치 풀을 사용한다.
  const devicePool = isFairytale ? FAIRYTALE_NARRATIVE_DEVICES : NARRATIVE_DEVICES;
  const narrativeDevice = devicePool[Math.floor(Math.random() * devicePool.length)];

  const firstNovelNote = isFirstNovel
    ? (isFairytale
        ? '\n이번이 시리즈의 **첫 번째 이야기**입니다. 주인공과 친구들, 그리고 이 따뜻한 세계를 아이에게 처음 소개하는 편이에요.\n'
        : '\n이번이 시리즈의 **첫 번째 이야기**입니다. 앞으로 이어질 연재의 토대가 될 인물과 세계관을 확립하세요.\n')
    : '';

  const fairytaleGuidelines = isFairytale ? FAIRYTALE_GUIDELINES : '';
  const blGuidelines = genre === 'BL' ? BL_GUIDELINES : '';

  return `당신은 ${persona}입니다.
하나의 긴 이야기를 여러 편에 걸쳐 이어가는 연재 ${isFairytale ? '동화' : '소설'}를 씁니다.
${firstNovelNote}
## ${isFairytale ? '동화' : '소설'} 설정
- 장르: ${genre}
- 분위기: ${atmosphere}
- 필체: ${style}
- 분량: ${LENGTH_GUIDE[length] ?? length}
${protagonistSection}
${narrativeSection}
${contextSection}
${worldSection}
${continuitySection}
${fairytaleGuidelines}
${blGuidelines}
## 창작 지침

**이번 편 서사 장치:** ${narrativeDevice}

위 장치를 자연스럽게 녹여서 ${isFairytale ? '아이가 빠져들 수 있는 따뜻한' : '예측 불가능한'} 이야기를 만드세요.

## 출력 형식
- 첫 줄에 ${isFairytale ? '동화' : '소설'} 제목을 「제목」 형식으로 작성
- 이후 본문을 작성
- 마크다운 헤더(#, ##)는 사용하지 말 것
- 자연스러운 단락 구분(빈 줄)을 사용할 것`;
}