import {
  MoodEntry, MoodEmoji, MOOD_MAP,
  WeatherEntry, WeatherType,
  NovelRecord, NovelConfig,
  Series, WorldBible, StoryBibleEntry,
  Genre,
} from './types';
import { generateId } from './utils';

const WEATHER_KEY = 'sagas_weather';
const MOOD_KEY          = 'sagas_moods';
const NOVEL_KEY         = 'sagas_novels';
const BIBLE_KEY         = 'sagas_story_bibles';
const WORLD_KEY         = 'sagas_world_bibles';  // 복수 — 시리즈마다 하나
const SERIES_KEY        = 'sagas_series';
const ACTIVE_SERIES_KEY = 'sagas_active_series_id';

// ─── Mood ─────────────────────────────────────────────────────────────────────

export function saveMood(entry: MoodEntry): void {
  if (typeof window === 'undefined') return;
  const history = loadMoodHistory();
  const idx = history.findIndex(e => e.date === entry.date);
  if (idx >= 0) history[idx] = entry; else history.unshift(entry);
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

export const moodStorage = {
  saveMood(emoji: MoodEmoji): void {
    saveMood({
      date: new Date().toISOString().slice(0, 10),
      emoji,
      label: MOOD_MAP[emoji].label,
    });
  },
  getTodayMood,
  loadMoodHistory,
};


// ─── Weather ──────────────────────────────────────────────────────────────────

export function saveWeather(entry: WeatherEntry): void {
  if (typeof window === 'undefined') return;
  const history = loadWeatherHistory();
  const idx = history.findIndex(e => e.date === entry.date);
  if (idx >= 0) history[idx] = entry; else history.unshift(entry);
  localStorage.setItem(WEATHER_KEY, JSON.stringify(history.slice(0, 30)));
}

export function loadWeatherHistory(): WeatherEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(WEATHER_KEY) || '[]'); }
  catch { return []; }
}

export function getTodayWeather(): WeatherEntry | null {
  const today = new Date().toISOString().slice(0, 10);
  return loadWeatherHistory().find(e => e.date === today) ?? null;
}

// ─── Series ───────────────────────────────────────────────────────────────────

export function loadAllSeries(): Series[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(SERIES_KEY) || '[]'); }
  catch { return []; }
}

export function saveSeries(series: Series): void {
  if (typeof window === 'undefined') return;
  const all = loadAllSeries();
  const idx = all.findIndex(s => s.id === series.id);
  if (idx >= 0) all[idx] = series; else all.unshift(series);
  localStorage.setItem(SERIES_KEY, JSON.stringify(all));
}

export function deleteSeries(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SERIES_KEY, JSON.stringify(loadAllSeries().filter(s => s.id !== id)));
}

/** 특정 시리즈의 episodeCount를 +1 업데이트 */
export function incrementEpisodeCount(seriesId: string): void {
  const all = loadAllSeries();
  const s = all.find(s => s.id === seriesId);
  if (s) { s.episodeCount += 1; localStorage.setItem(SERIES_KEY, JSON.stringify(all)); }
}

/** 직전 위저드 설정을 시리즈에 저장 */
export function updateSeriesLastOptions(seriesId: string, options: import('./types').SeriesLastOptions): void {
  const all = loadAllSeries();
  const s = all.find(s => s.id === seriesId);
  if (s) { s.lastOptions = options; localStorage.setItem(SERIES_KEY, JSON.stringify(all)); }
}

/** 시리즈 제목을 worldSetting 기반으로 업데이트 */
export function updateSeriesTitle(seriesId: string, title: string): void {
  const all = loadAllSeries();
  const s = all.find(s => s.id === seriesId);
  if (s) { s.title = title; localStorage.setItem(SERIES_KEY, JSON.stringify(all)); }
}

// ─── Active Series ────────────────────────────────────────────────────────────

export function saveActiveSeriesId(id: string | null): void {
  if (typeof window === 'undefined') return;
  if (id) localStorage.setItem(ACTIVE_SERIES_KEY, id);
  else localStorage.removeItem(ACTIVE_SERIES_KEY);
}

export function loadActiveSeriesId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(ACTIVE_SERIES_KEY);
}

// ─── Novel ────────────────────────────────────────────────────────────────────

export function loadAllNovels(): NovelRecord[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(NOVEL_KEY) || '[]'); }
  catch { return []; }
}

export function loadNovels(seriesId?: string): NovelRecord[] {
  const all = loadAllNovels();
  return seriesId ? all.filter(n => n.seriesId === seriesId) : all;
}

export function saveNovel(novel: NovelRecord): void {
  if (typeof window === 'undefined') return;
  const all = loadAllNovels();
  const idx = all.findIndex(n => n.id === novel.id);
  if (idx >= 0) all[idx] = novel; else all.unshift(novel);
  localStorage.setItem(NOVEL_KEY, JSON.stringify(all));
}

export function deleteNovel(id: string): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(NOVEL_KEY, JSON.stringify(loadAllNovels().filter(n => n.id !== id)));
}

/** NovelViewer가 사용하는 객체 인터페이스 */
export const novelStorage = {
  save({ title, content, config, baseMood }: {
    title: string;
    content: string;
    config: NovelConfig;
    baseMood: string;
  }): NovelRecord {
    const seriesId = config.seriesId ?? 'default';
    const record: NovelRecord = {
      id: generateId(),
      seriesId,
      title,
      content,
      config,
      baseMood: baseMood as MoodEmoji,
      createdAt: Date.now(),
    };
    saveNovel(record);
    return record;
  },
  loadAll: loadAllNovels,
  delete:  deleteNovel,
};

// ─── World Bible ──────────────────────────────────────────────────────────────

export function loadAllWorldBibles(): WorldBible[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(WORLD_KEY) || '[]'); }
  catch { return []; }
}

export function loadWorldBible(seriesId: string): WorldBible | null {
  return loadAllWorldBibles().find(w => w.seriesId === seriesId) ?? null;
}

export function saveWorldBible(world: WorldBible): void {
  if (typeof window === 'undefined') return;
  const all = loadAllWorldBibles();
  const idx = all.findIndex(w => w.seriesId === world.seriesId);
  if (idx >= 0) all[idx] = world; else all.push(world);
  localStorage.setItem(WORLD_KEY, JSON.stringify(all));
}

export function mergeCharactersIntoWorldBible(
  seriesId: string,
  newChars: Array<{ name: string; role: string; traits: string }>
): void {
  const world = loadWorldBible(seriesId);
  if (!world) return;
  for (const nc of newChars) {
    if (!world.characters.some(c => c.name === nc.name)) world.characters.push(nc);
  }
  saveWorldBible(world);
}

// ─── Story Bible ──────────────────────────────────────────────────────────────

export function loadAllStoryBibles(): StoryBibleEntry[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(BIBLE_KEY) || '[]'); }
  catch { return []; }
}

export function loadStoryBibles(seriesId: string): StoryBibleEntry[] {
  return loadAllStoryBibles().filter(b => b.seriesId === seriesId);
}

export function saveStoryBible(entry: StoryBibleEntry): void {
  if (typeof window === 'undefined') return;
  const all = loadAllStoryBibles();
  const idx = all.findIndex(b => b.novelId === entry.novelId);
  if (idx >= 0) all[idx] = entry; else all.push(entry);
  localStorage.setItem(BIBLE_KEY, JSON.stringify(all));
}

// ─── 전체 초기화 ──────────────────────────────────────────────────────────────

export function clearAll(): void {
  if (typeof window === 'undefined') return;
  [MOOD_KEY, NOVEL_KEY, BIBLE_KEY, WORLD_KEY, SERIES_KEY, ACTIVE_SERIES_KEY]
    .forEach(k => localStorage.removeItem(k));
}