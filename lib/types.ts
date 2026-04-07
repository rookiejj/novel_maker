// ─── Mood ────────────────────────────────────────────────────────────────────

export type MoodEmoji = '😊' | '😌' | '🤩' | '😰' | '😢' | '😴' | '😤' | '😑';

/** 기존 코드 호환용 별칭 */
export type MoodType = MoodEmoji;

export const MOOD_MAP: Record<MoodEmoji, { emoji: string; label: string; tw: string }> = {
  '😊': { emoji: '😊', label: '행복해',  tw: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
  '😌': { emoji: '😌', label: '평온해',  tw: 'border-green-300  bg-green-50  text-green-700'  },
  '🤩': { emoji: '🤩', label: '설레',    tw: 'border-pink-300   bg-pink-50   text-pink-700'   },
  '😰': { emoji: '😰', label: '불안해',  tw: 'border-blue-300   bg-blue-50   text-blue-700'   },
  '😢': { emoji: '😢', label: '슬퍼',    tw: 'border-indigo-300 bg-indigo-50 text-indigo-700' },
  '😴': { emoji: '😴', label: '피곤해',  tw: 'border-purple-300 bg-purple-50 text-purple-700' },
  '😤': { emoji: '😤', label: '화나',    tw: 'border-red-300    bg-red-50    text-red-700'    },
  '😑': { emoji: '😑', label: '무료해',  tw: 'border-stone-300  bg-stone-50  text-stone-500'  },
};

export interface MoodEntry {
  date: string; // YYYY-MM-DD
  emoji: MoodEmoji;
  label: string;
}

// ─── Novel Options ────────────────────────────────────────────────────────────

export type Genre =
  | '로맨스'
  | 'SF'
  | '판타지'
  | '공포'
  | '미스터리'
  | '일상'
  | '성장'
  | '역사';

export type Atmosphere =
  | '따뜻한'
  | '서늘한'
  | '몽환적인'
  | '긴장감 있는'
  | '유쾌한'
  | '슬픈'
  | '잔잔한';

export type WritingStyle =
  | '간결한 문체'
  | '서정적 문체'
  | '대화 중심'
  | '묘사 중심';

export type NovelLength =
  | '단편 (500자)'
  | '중편 (1500자)'
  | '장편 (3000자)';

export interface NovelOptions {
  genre: Genre;
  atmosphere: Atmosphere;
  style: WritingStyle;
  length: NovelLength;
}

// ─── World Bible ──────────────────────────────────────────────────────────────
// 시리즈 전체에 걸쳐 고정되는 세계관 설정.
// 첫 소설 저장 시 단 한 번 생성되고, 이후 절대 변경하지 않는다.
// 새 소설을 쓸 때마다 반드시 프롬프트에 주입한다.

export interface CharacterProfile {
  name: string;   // 이름
  role: string;   // 역할 (예: "주인공", "조력자", "라이벌")
  traits: string; // 성격·외모·직업 등 핵심 특징 한 줄
}

export interface WorldBible {
  genre: Genre;                   // 고정 장르 (이후 소설에서 변경 불가)
  worldSetting: string;           // 세계관/주요 배경 한 줄
  characters: CharacterProfile[]; // 주요 인물 프로필 (편마다 누적)
  rules: string[];                // 세계관 규칙 (예: "마법 존재", "근미래 AI 사회")
  createdAt: string;              // 최초 생성 일자 YYYY-MM-DD
}

// ─── Story Bible ─────────────────────────────────────────────────────────────
// 소설 1편당 저장되는 경량 요약본 (~80 토큰).
// 원문 대신 프롬프트에 주입해 토큰을 절약한다.

export interface StoryBibleEntry {
  novelId: string;
  title: string;
  date: string;            // YYYY-MM-DD
  mood: string;            // 당일 기분 레이블
  ending: string;          // 결말 한 줄 요약
  threads: string[];       // 미해결 복선 / 열린 결말 요소
  newCharacters: string[]; // 이번 편에서 새로 등장한 인물 (이름+특징)
}

// ─── Saved Novel ─────────────────────────────────────────────────────────────

export interface SavedNovel {
  id: string;
  title: string;
  content: string;
  mood: MoodEmoji;
  options: NovelOptions;
  createdAt: string; // ISO 8601
}