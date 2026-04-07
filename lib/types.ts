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