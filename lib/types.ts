// ─── Mood ────────────────────────────────────────────────────────────────────

export type MoodEmoji = '😊' | '😌' | '🤩' | '😰' | '😢' | '😴' | '😤' | '😑';

export const MOOD_MAP: Record<MoodEmoji, string> = {
  '😊': '행복해',
  '😌': '평온해',
  '🤩': '설레',
  '😰': '불안해',
  '😢': '슬퍼',
  '😴': '피곤해',
  '😤': '화나',
  '😑': '무료해',
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

// ─── Story Bible ─────────────────────────────────────────────────────────────
// 소설 저장 시 Claude(Haiku)가 생성하는 경량 요약본.
// 새 소설을 생성할 때 원문 대신 이것만 프롬프트에 주입해 토큰을 절약한다.

export interface StoryBibleEntry {
  novelId: string;
  title: string;
  date: string;         // YYYY-MM-DD
  genre: Genre;
  mood: string;         // 당일 기분 레이블 (예: "슬퍼")
  characters: string[]; // ["이름(특징/관계)", ...]   — 없으면 []
  setting: string;      // 주요 배경 한 줄
  ending: string;       // 결말 한 줄 요약
  threads: string[];    // 미해결 복선 / 열린 결말 요소 — 없으면 []
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