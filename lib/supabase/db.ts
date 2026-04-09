import { createClient } from './client';
import {
  MoodEntry, WeatherEntry,
  NovelRecord, Series, SeriesLastOptions,
  WorldBible, StoryBibleEntry,
  MoodEmoji, IllustrationStatus,
} from '../types';
import { generateId } from '../utils';

const supabase = createClient();

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

// ─── Mood ─────────────────────────────────────────────────────────────────────

export async function saveMood(entry: MoodEntry): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  await supabase.from('mood_records').upsert(
    {
      id: generateId(),
      user_id,
      date: entry.date,
      emoji: entry.emoji,
      label: entry.label,
    },
    { onConflict: 'user_id,date' }
  );
}

export async function loadMoodHistory(): Promise<MoodEntry[]> {
  const user_id = await uid(); if (!user_id) return [];
  const { data } = await supabase
    .from('mood_records').select('date, emoji, label')
    .eq('user_id', user_id)
    .order('date', { ascending: false })
    .limit(30);
  return (data ?? []).map(r => ({
    date: r.date as string,
    emoji: r.emoji as MoodEmoji,
    label: r.label as string,
  }));
}

export async function getTodayMood(): Promise<MoodEntry | null> {
  const user_id = await uid(); if (!user_id) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('mood_records').select('date, emoji, label')
    .eq('user_id', user_id).eq('date', today).maybeSingle();
  if (!data) return null;
  return {
    date: data.date as string,
    emoji: data.emoji as MoodEmoji,
    label: data.label as string,
  };
}

// ─── Weather ──────────────────────────────────────────────────────────────────

export async function saveWeather(entry: WeatherEntry): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  await supabase.from('weather_records').upsert(
    {
      id: generateId(),
      user_id,
      date: entry.date,
      weather: entry.weather,
    },
    { onConflict: 'user_id,date' }
  );
}

export async function loadWeatherHistory(): Promise<WeatherEntry[]> {
  const user_id = await uid(); if (!user_id) return [];
  const { data } = await supabase
    .from('weather_records').select('date, weather')
    .eq('user_id', user_id)
    .order('date', { ascending: false })
    .limit(30);
  return (data ?? []).map(r => ({
    date: r.date as string,
    weather: r.weather as WeatherEntry['weather'],
  }));
}

export async function getTodayWeather(): Promise<WeatherEntry | null> {
  const user_id = await uid(); if (!user_id) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from('weather_records').select('date, weather')
    .eq('user_id', user_id).eq('date', today).maybeSingle();
  if (!data) return null;
  return {
    date: data.date as string,
    weather: data.weather as WeatherEntry['weather'],
  };
}

// ─── Series ───────────────────────────────────────────────────────────────────

function rowToSeries(r: Record<string, unknown>): Series {
  return {
    id:                r.id                  as string,
    title:             r.title               as string,
    genre:             r.genre               as Series['genre'],
    protagonistName:   (r.protagonist_name   as string | null) ?? undefined,
    protagonistGender: r.protagonist_gender  as Series['protagonistGender'],
    totalEpisodes:     r.total_episodes      as Series['totalEpisodes'],
    episodeCount:      (r.episode_count      as number) ?? 0,
    lastOptions:       (r.last_options       as SeriesLastOptions | null) ?? undefined,
    createdAt:         Number(r.created_at),
  };
}

export async function loadAllSeries(): Promise<Series[]> {
  const user_id = await uid(); if (!user_id) return [];
  const { data } = await supabase
    .from('series').select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });
  return (data ?? []).map(rowToSeries);
}

export async function saveSeries(series: Series): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  await supabase.from('series').upsert({
    id:                 series.id,
    user_id,
    title:              series.title,
    genre:              series.genre,
    protagonist_name:   series.protagonistName ?? null,
    protagonist_gender: series.protagonistGender,
    total_episodes:     series.totalEpisodes,
    episode_count:      series.episodeCount,
    last_options:       series.lastOptions ?? null,
    created_at:         series.createdAt,
  });
}

export async function deleteSeries(id: string): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  await supabase.from('series').delete().eq('id', id).eq('user_id', user_id);
}

export async function incrementEpisodeCount(seriesId: string): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  const { data } = await supabase
    .from('series').select('episode_count')
    .eq('id', seriesId).eq('user_id', user_id).maybeSingle();
  if (!data) return;
  await supabase.from('series')
    .update({ episode_count: ((data.episode_count as number) ?? 0) + 1 })
    .eq('id', seriesId).eq('user_id', user_id);
}

export async function updateSeriesLastOptions(
  seriesId: string, options: SeriesLastOptions
): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  await supabase.from('series')
    .update({ last_options: options })
    .eq('id', seriesId).eq('user_id', user_id);
}

export async function updateSeriesTitle(seriesId: string, title: string): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  await supabase.from('series')
    .update({ title })
    .eq('id', seriesId).eq('user_id', user_id);
}

// ─── Active Series ────────────────────────────────────────────────────────────

export async function saveActiveSeriesId(id: string | null): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  if (id === null) {
    await supabase.from('active_series').delete().eq('user_id', user_id);
  } else {
    await supabase.from('active_series').upsert({ user_id, series_id: id });
  }
}

export async function loadActiveSeriesId(): Promise<string | null> {
  const user_id = await uid(); if (!user_id) return null;
  const { data } = await supabase
    .from('active_series').select('series_id')
    .eq('user_id', user_id).maybeSingle();
  return (data?.series_id as string | null) ?? null;
}

// ─── Novel ────────────────────────────────────────────────────────────────────

function rowToNovel(r: Record<string, unknown>): NovelRecord {
  return {
    id:                 r.id                   as string,
    seriesId:           r.series_id            as string,
    title:              r.title                as string,
    content:            r.content              as string,
    config:             r.config               as NovelRecord['config'],
    baseMood:           r.base_mood            as MoodEmoji,
    createdAt:          Number(r.created_at),
    illustrationUrl:    (r.illustration_url    as string | null) ?? null,
    illustrationStatus: (r.illustration_status as IllustrationStatus | null) ?? 'pending',
  };
}

export async function loadAllNovels(): Promise<NovelRecord[]> {
  const user_id = await uid(); if (!user_id) return [];
  const { data } = await supabase
    .from('novels').select('*')
    .eq('user_id', user_id)
    .order('created_at', { ascending: false });
  return (data ?? []).map(rowToNovel);
}

export async function loadNovels(seriesId?: string): Promise<NovelRecord[]> {
  const user_id = await uid(); if (!user_id) return [];
  let q = supabase.from('novels').select('*').eq('user_id', user_id);
  if (seriesId) q = q.eq('series_id', seriesId);
  const { data } = await q.order('created_at', { ascending: false });
  return (data ?? []).map(rowToNovel);
}

export async function saveNovel(novel: NovelRecord): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  const { error } = await supabase.from('novels').upsert({
    id:         novel.id,
    user_id,
    series_id:  novel.seriesId,
    title:      novel.title,
    content:    novel.content,
    config:     novel.config,
    base_mood:  novel.baseMood,
    created_at: novel.createdAt,
  });
  if (error) {
    console.error('[saveNovel] Supabase error:', error);
    throw error;
  }
}

export async function deleteNovel(id: string): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  await supabase.from('novels').delete().eq('id', id).eq('user_id', user_id);
}

// ─── World Bible ──────────────────────────────────────────────────────────────

function rowToWorldBible(r: Record<string, unknown>): WorldBible {
  return {
    seriesId:     r.series_id     as string,
    genre:        r.genre         as WorldBible['genre'],
    worldSetting: r.world_setting as string,
    characters:   (r.characters   as WorldBible['characters']) ?? [],
    rules:        (r.rules        as string[]) ?? [],
    createdAt:    r.created_at    as string,
  };
}

export async function loadAllWorldBibles(): Promise<WorldBible[]> {
  const user_id = await uid(); if (!user_id) return [];
  const { data } = await supabase
    .from('world_bibles').select('*').eq('user_id', user_id);
  return (data ?? []).map(rowToWorldBible);
}

export async function loadWorldBible(seriesId: string): Promise<WorldBible | null> {
  const user_id = await uid(); if (!user_id) return null;
  const { data } = await supabase
    .from('world_bibles').select('*')
    .eq('user_id', user_id).eq('series_id', seriesId).maybeSingle();
  return data ? rowToWorldBible(data) : null;
}

export async function saveWorldBible(world: WorldBible): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  await supabase.from('world_bibles').upsert({
    series_id:     world.seriesId,
    user_id,
    genre:         world.genre,
    world_setting: world.worldSetting,
    characters:    world.characters,
    rules:         world.rules,
    created_at:    world.createdAt,
  });
}

export async function mergeCharactersIntoWorldBible(
  seriesId: string,
  newChars: Array<{ name: string; role: string; traits: string }>
): Promise<void> {
  const world = await loadWorldBible(seriesId);
  if (!world) return;
  for (const nc of newChars) {
    if (!world.characters.some(c => c.name === nc.name)) world.characters.push(nc);
  }
  await saveWorldBible(world);
}

// ─── Story Bible ──────────────────────────────────────────────────────────────

function rowToStoryBible(r: Record<string, unknown>): StoryBibleEntry {
  return {
    novelId:       r.novel_id        as string,
    seriesId:      r.series_id       as string,
    title:         r.title           as string,
    date:          r.date            as string,
    mood:          r.mood            as string,
    ending:        r.ending          as string,
    threads:       (r.threads        as string[]) ?? [],
    newCharacters: (r.new_characters as string[]) ?? [],
  };
}

export async function loadAllStoryBibles(): Promise<StoryBibleEntry[]> {
  const user_id = await uid(); if (!user_id) return [];
  const { data } = await supabase
    .from('story_bibles').select('*').eq('user_id', user_id);
  return (data ?? []).map(rowToStoryBible);
}

export async function loadStoryBibles(seriesId: string): Promise<StoryBibleEntry[]> {
  const user_id = await uid(); if (!user_id) return [];
  const { data } = await supabase
    .from('story_bibles').select('*')
    .eq('user_id', user_id).eq('series_id', seriesId);
  return (data ?? []).map(rowToStoryBible);
}

export async function saveStoryBible(entry: StoryBibleEntry): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  await supabase.from('story_bibles').upsert({
    novel_id:       entry.novelId,
    user_id,
    series_id:      entry.seriesId,
    title:          entry.title,
    date:           entry.date,
    mood:           entry.mood,
    ending:         entry.ending,
    threads:        entry.threads,
    new_characters: entry.newCharacters,
  });
}

// ─── 전체 초기화 ──────────────────────────────────────────────────────────────

export async function clearAll(): Promise<void> {
  const user_id = await uid(); if (!user_id) return;
  await Promise.all([
    supabase.from('story_bibles').delete().eq('user_id', user_id),
    supabase.from('world_bibles').delete().eq('user_id', user_id),
    supabase.from('novels').delete().eq('user_id', user_id),
    supabase.from('active_series').delete().eq('user_id', user_id),
    supabase.from('series').delete().eq('user_id', user_id),
    supabase.from('mood_records').delete().eq('user_id', user_id),
    supabase.from('weather_records').delete().eq('user_id', user_id),
  ]);
}