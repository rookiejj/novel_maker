import { MoodEntry, SavedNovel, StoryBibleEntry } from './types';

const MOOD_KEY   = 'sagas_moods';
const NOVEL_KEY  = 'sagas_novels';
const BIBLE_KEY  = 'sagas_story_bibles';

// ─── Mood ─────────────────────────────────────────────────────────────────────

export function saveMood(entry: MoodEntry): void {
  if (typeof window === 'undefined') return;
  const history = loadMoodHistory();
  const idx = history.findIndex(e => e.date === entry.date);
  if (idx >= 0) history[idx] = entry;
  else history.unshift(entry);
  localStorage.setItem(MOOD_KEY, JSON.stringify(history.slice(0, 30)));
}

export function loadMoodHistory(): MoodEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(MOOD_KEY) || '[]');
  } catch {
    return [];
  }
}

export function getTodayMood(): MoodEntry | null {
  const today = new Date().toISOString().slice(0, 10);
  return loadMoodHistory().find(e => e.date === today) ?? null;
}

// ─── Novel ────────────────────────────────────────────────────────────────────

export function saveNovel(novel: SavedNovel): void {
  if (typeof window === 'undefined') return;
  const novels = loadNovels();
  const idx = novels.findIndex(n => n.id === novel.id);
  if (idx >= 0) novels[idx] = novel;
  else novels.unshift(novel);
  localStorage.setItem(NOVEL_KEY, JSON.stringify(novels));
}

export function loadNovels(): SavedNovel[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(NOVEL_KEY) || '[]');
  } catch {
    return [];
  }
}

export function deleteNovel(id: string): void {
  if (typeof window === 'undefined') return;
  const novels = loadNovels().filter(n => n.id !== id);
  localStorage.setItem(NOVEL_KEY, JSON.stringify(novels));
}

// ─── Story Bible ──────────────────────────────────────────────────────────────
// 원문 대신 경량 요약만 보관. 새 소설 생성 시 이것만 프롬프트에 주입.

export function saveStoryBible(entry: StoryBibleEntry): void {
  if (typeof window === 'undefined') return;
  const bibles = loadStoryBibles();
  const idx = bibles.findIndex(b => b.novelId === entry.novelId);
  if (idx >= 0) bibles[idx] = entry;
  else bibles.push(entry);
  localStorage.setItem(BIBLE_KEY, JSON.stringify(bibles));
}

export function loadStoryBibles(): StoryBibleEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(BIBLE_KEY) || '[]');
  } catch {
    return [];
  }
}

export function deleteStoryBible(novelId: string): void {
  if (typeof window === 'undefined') return;
  const bibles = loadStoryBibles().filter(b => b.novelId !== novelId);
  localStorage.setItem(BIBLE_KEY, JSON.stringify(bibles));
}