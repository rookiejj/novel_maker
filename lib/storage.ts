import { MoodEntry, MoodEmoji, MOOD_MAP, SavedNovel, StoryBibleEntry, WorldBible } from './types';

const MOOD_KEY  = 'sagas_moods';
const NOVEL_KEY = 'sagas_novels';
const BIBLE_KEY = 'sagas_story_bibles';
const WORLD_KEY = 'sagas_world_bible';

// Mood

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
  try { return JSON.parse(localStorage.getItem(MOOD_KEY) || '[]'); }
  catch { return []; }
}

export function getTodayMood(): MoodEntry | null {
  const today = new Date().toISOString().slice(0, 10);
  return loadMoodHistory().find(e => e.date === today) ?? null;
}

/** MoodSelector 컴포넌트가 사용하는 객체 인터페이스 호환용 */
export const moodStorage = {
  saveMood(emoji: MoodEmoji): void {
    const entry: MoodEntry = {
      date: new Date().toISOString().slice(0, 10),
      emoji,
      label: MOOD_MAP[emoji].label,
    };
    saveMood(entry);
  },
  getTodayMood,
  loadMoodHistory,
};

// Novel

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
  try { return JSON.parse(localStorage.getItem(NOVEL_KEY) || '[]'); }
  catch { return []; }
}

export function deleteNovel(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOVEL_KEY, JSON.stringify(loadNovels().filter(n => n.id !== id)));
}

// Story Bible

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
  try { return JSON.parse(localStorage.getItem(BIBLE_KEY) || '[]'); }
  catch { return []; }
}

export function deleteStoryBible(novelId: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(BIBLE_KEY, JSON.stringify(loadStoryBibles().filter(b => b.novelId !== novelId)));
}

// World Bible

export function saveWorldBible(world: WorldBible): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(WORLD_KEY, JSON.stringify(world));
}

export function loadWorldBible(): WorldBible | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(WORLD_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

/**
 * 새 편에서 등장한 신규 인물을 World Bible에 누적.
 * 이름이 이미 존재하면 덮어쓰지 않는다 (최초 설정 우선).
 */
export function mergeCharactersIntoWorldBible(
  newCharacters: Array<{ name: string; role: string; traits: string }>
): void {
  const world = loadWorldBible();
  if (!world) return;
  for (const nc of newCharacters) {
    const exists = world.characters.some(c => c.name === nc.name);
    if (!exists) world.characters.push(nc);
  }
  saveWorldBible(world);
}

export function clearAll(): void {
  if (typeof window === 'undefined') return;
  [MOOD_KEY, NOVEL_KEY, BIBLE_KEY, WORLD_KEY].forEach(k => localStorage.removeItem(k));
}