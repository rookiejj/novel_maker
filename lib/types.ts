// ─── Mood ────────────────────────────────────────────────────────────────────

export type MoodEmoji = '😊' | '😌' | '🤩' | '😰' | '😢' | '😴' | '😤' | '😑';
export type MoodType = MoodEmoji; // 호환용 별칭

export const MOOD_MAP: Record<MoodEmoji, { emoji: string; label: string; tw: string }> = {
  '😊': { emoji: '😊', label: '행복해',   tw: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
  '😌': { emoji: '😌', label: '평온해',   tw: 'border-green-300  bg-green-50  text-green-700'  },
  '🤩': { emoji: '🤩', label: '설레',     tw: 'border-pink-300   bg-pink-50   text-pink-700'   },
  '😰': { emoji: '😰', label: '불안해',   tw: 'border-blue-300   bg-blue-50   text-blue-700'   },
  '😢': { emoji: '😢', label: '슬퍼',     tw: 'border-indigo-300 bg-indigo-50 text-indigo-700' },
  '😴': { emoji: '😴', label: '피곤해',   tw: 'border-purple-300 bg-purple-50 text-purple-700' },
  '😤': { emoji: '😤', label: '화나',     tw: 'border-red-300    bg-red-50    text-red-700'    },
  '😑': { emoji: '😑', label: '무료해',   tw: 'border-stone-300  bg-stone-50  text-stone-500'  },
};

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  emoji: MoodEmoji;
  label: string;
}

export interface MoodRecord {
  id: string;
  date: string;  // YYYY-MM-DD
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

/**
 * NovelConfig — 소설 생성에 필요한 모든 설정.
 * worldBible/storyBibles를 포함해 API 호출 시 config 하나로 전달한다.
 */
export interface NovelConfig {
  genre: Genre;
  atmosphere: Atmosphere;
  style: WritingStyle;
  length: NovelLength;
  worldBible?: WorldBible | null;
  storyBibles?: StoryBibleEntry[];
}

export type NovelOptions = NovelConfig; // 호환용 별칭

export interface NovelRecord {
  id: string;
  title: string;
  content: string;
  config: NovelConfig;
  baseMood: MoodEmoji;
  createdAt: number; // Unix timestamp (ms)
}

export type SavedNovel = NovelRecord; // 호환용 별칭

// ─── World Bible ──────────────────────────────────────────────────────────────

export interface CharacterProfile {
  name: string;
  role: string;
  traits: string;
}

export interface WorldBible {
  genre: Genre;
  worldSetting: string;
  characters: CharacterProfile[];
  rules: string[];
  createdAt: string; // YYYY-MM-DD
}

// ─── Story Bible ─────────────────────────────────────────────────────────────

export interface StoryBibleEntry {
  novelId: string;
  title: string;
  date: string;
  mood: string;
  ending: string;
  threads: string[];
  newCharacters: string[];
}