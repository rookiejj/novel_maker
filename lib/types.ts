// ─── Mood ────────────────────────────────────────────────────────────────────

export const MOOD_MAP = {
  happy:   { label: '행복해',  emoji: '😊', tw: 'bg-yellow-100 border-yellow-400 text-yellow-700' },
  peaceful:{ label: '평온해',  emoji: '😌', tw: 'bg-sky-100 border-sky-400 text-sky-700' },
  excited: { label: '설레',    emoji: '🤩', tw: 'bg-pink-100 border-pink-400 text-pink-700' },
  anxious: { label: '불안해',  emoji: '😰', tw: 'bg-purple-100 border-purple-400 text-purple-700' },
  sad:     { label: '슬퍼',    emoji: '😢', tw: 'bg-blue-100 border-blue-400 text-blue-700' },
  tired:   { label: '피곤해',  emoji: '😴', tw: 'bg-gray-100 border-gray-400 text-gray-600' },
  angry:   { label: '화나',    emoji: '😤', tw: 'bg-red-100 border-red-400 text-red-700' },
  bored:   { label: '무료해',  emoji: '😑', tw: 'bg-slate-100 border-slate-400 text-slate-600' },
} as const;

export type MoodType = keyof typeof MOOD_MAP;

export interface MoodRecord {
  id: string;
  mood: MoodType;
  date: string;       // 'YYYY-MM-DD'
  timestamp: number;
}

// ─── Novel Config ─────────────────────────────────────────────────────────────

export const GENRE_MAP = {
  romance:   { label: '로맨스',   icon: '💕' },
  fantasy:   { label: '판타지',   icon: '✨' },
  mystery:   { label: '미스터리', icon: '🔍' },
  scifi:     { label: 'SF',        icon: '🚀' },
  daily:     { label: '일상',     icon: '☕' },
  horror:    { label: '공포',     icon: '👻' },
  adventure: { label: '모험',     icon: '🗺️' },
  thriller:  { label: '스릴러',   icon: '🎭' },
} as const;

export type Genre = keyof typeof GENRE_MAP;

export const ATMOSPHERE_MAP = {
  warm:       { label: '따뜻한',     icon: '🌻' },
  melancholic:{ label: '쓸쓸한',     icon: '🍂' },
  humorous:   { label: '유머러스',   icon: '😄' },
  tense:      { label: '긴장감 있는',icon: '⚡' },
  dreamy:     { label: '몽환적인',   icon: '🌙' },
  nostalgic:  { label: '향수어린',   icon: '🎞️' },
  dark:       { label: '어두운',     icon: '🌑' },
  refreshing: { label: '청량한',     icon: '🍃' },
} as const;

export type Atmosphere = keyof typeof ATMOSPHERE_MAP;

export const WRITING_STYLE_MAP = {
  literary:        { label: '문학적',     desc: '깊이 있는 문장과 은유' },
  concise:         { label: '간결한',     desc: '군더더기 없이 명확한' },
  lyrical:         { label: '서정적',     desc: '감성적이고 시적인 표현' },
  'fast-paced':    { label: '빠른 전개',  desc: '속도감 있는 스토리라인' },
  descriptive:     { label: '묘사 중심',  desc: '생생한 장면과 감각 묘사' },
  dialogue:        { label: '대화 중심',  desc: '인물 간 대화로 이끌어가는' },
} as const;

export type WritingStyle = keyof typeof WRITING_STYLE_MAP;

export const NOVEL_LENGTH_MAP = {
  short:  { label: '단편',  desc: '5분 안에 읽는 짧은 이야기', tokens: 1200 },
  medium: { label: '중단편', desc: '15분 분량의 충실한 이야기',  tokens: 2800 },
} as const;

export type NovelLength = keyof typeof NOVEL_LENGTH_MAP;

export interface NovelConfig {
  genre: Genre;
  atmosphere: Atmosphere;
  writingStyle: WritingStyle;
  length: NovelLength;
}

// ─── Novel Record ─────────────────────────────────────────────────────────────

export interface NovelRecord {
  id: string;
  title: string;
  content: string;
  config: NovelConfig;
  baseMood: MoodType;
  createdAt: number;
}

// ─── API ──────────────────────────────────────────────────────────────────────

export interface GenerateNovelRequest {
  config: NovelConfig;
  recentMoods: MoodRecord[];
}