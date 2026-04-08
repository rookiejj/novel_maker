// ─── Mood ────────────────────────────────────────────────────────────────────

export type MoodEmoji = '😊' | '😌' | '🤩' | '😰' | '😢' | '😴' | '😤' | '😑';
export type MoodType = MoodEmoji;

export const MOOD_MAP: Record<MoodEmoji, { emoji: string; label: string; tw: string }> = {
  '😊': { emoji: '😊', label: '행복해',   tw: 'ring-yellow-400 bg-yellow-50 text-yellow-700' },
  '😌': { emoji: '😌', label: '평온해',   tw: 'ring-emerald-400 bg-emerald-50 text-emerald-700' },
  '🤩': { emoji: '🤩', label: '설레',     tw: 'ring-pink-400 bg-pink-50 text-pink-700' },
  '😰': { emoji: '😰', label: '불안해',   tw: 'ring-blue-400 bg-blue-50 text-blue-700' },
  '😢': { emoji: '😢', label: '슬퍼',     tw: 'ring-indigo-400 bg-indigo-50 text-indigo-700' },
  '😴': { emoji: '😴', label: '피곤해',   tw: 'ring-purple-400 bg-purple-50 text-purple-700' },
  '😤': { emoji: '😤', label: '화나',     tw: 'ring-rose-400 bg-rose-50 text-rose-700' },
  '😑': { emoji: '😑', label: '무료해',   tw: 'ring-slate-400 bg-slate-50 text-slate-500' },
};

export interface MoodEntry {
  date: string;
  emoji: MoodEmoji;
  label: string;
}

export interface MoodRecord {
  id: string;
  date: string;
  mood: MoodEmoji;
}

// ─── Novel ────────────────────────────────────────────────────────────────────

export type Genre =
  | '로맨스' | 'SF' | '판타지' | '공포'
  | '미스터리' | '일상' | '성장' | '역사';

export type Atmosphere =
  | '따뜻한' | '서늘한' | '몽환적인' | '긴장감 있는'
  | '유쾌한' | '슬픈' | '잔잔한';

export type WritingStyle =
  | '간결한 문체' | '서정적 문체' | '대화 중심' | '묘사 중심';

export type NovelLength =
  | '단편 (500자)' | '중편 (1500자)' | '장편 (3000자)';

export type SeriesLength = 20 | 30;

export const GENRE_MAP: Record<Genre, { icon: string; label: string }> = {
  '로맨스':   { icon: '💕', label: '로맨스'   },
  'SF':       { icon: '🚀', label: 'SF'       },
  '판타지':   { icon: '🔮', label: '판타지'   },
  '공포':     { icon: '👻', label: '공포'     },
  '미스터리': { icon: '🔍', label: '미스터리' },
  '일상':     { icon: '☕', label: '일상'     },
  '성장':     { icon: '🌱', label: '성장'     },
  '역사':     { icon: '📜', label: '역사'     },
};

export const ATMOSPHERE_MAP: Record<Atmosphere, { label: string }> = {
  '따뜻한':      { label: '따뜻한'      },
  '서늘한':      { label: '서늘한'      },
  '몽환적인':    { label: '몽환적인'    },
  '긴장감 있는': { label: '긴장감 있는' },
  '유쾌한':      { label: '유쾌한'      },
  '슬픈':        { label: '슬픈'        },
  '잔잔한':      { label: '잔잔한'      },
};

export interface NovelConfig {
  genre: Genre;
  atmosphere: Atmosphere;
  style: WritingStyle;
  length: NovelLength;
  seriesId?: string;
  protagonistName?: string;
  totalEpisodes?: SeriesLength;  // 시리즈 총 편수
  currentEpisode?: number;       // 이번 편 번호 (1-based)
  worldBible?: WorldBible | null;
  storyBibles?: StoryBibleEntry[];
}

export type NovelOptions = NovelConfig;

export interface NovelRecord {
  id: string;
  seriesId: string;
  title: string;
  content: string;
  config: NovelConfig;
  baseMood: MoodEmoji;
  createdAt: number;
}

export type SavedNovel = NovelRecord;

// ─── Series ───────────────────────────────────────────────────────────────────

export interface Series {
  id: string;
  title: string;
  genre: Genre;
  protagonistName?: string;
  totalEpisodes: SeriesLength;   // 총 편수 (한 번 설정 후 고정)
  episodeCount: number;
  createdAt: number;
}

// ─── World Bible ──────────────────────────────────────────────────────────────

export interface CharacterProfile {
  name: string;
  role: string;
  traits: string;
}

export interface WorldBible {
  seriesId: string;
  genre: Genre;
  worldSetting: string;
  characters: CharacterProfile[];
  rules: string[];
  createdAt: string;
}

// ─── Story Bible ─────────────────────────────────────────────────────────────

export interface StoryBibleEntry {
  novelId: string;
  seriesId: string;
  title: string;
  date: string;
  mood: string;
  ending: string;
  threads: string[];
  newCharacters: string[];
}