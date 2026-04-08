// localStorage에서 Supabase로 이전됨.
// 이 파일은 기존 호출부의 이름을 유지하기 위한 re-export 레이어입니다.
// 모든 함수는 async로 변경되었습니다.

import type { MoodEmoji, NovelConfig, NovelRecord } from './types';
import { MOOD_MAP } from './types';
import { generateId } from './utils';

export {
  saveMood,
  loadMoodHistory,
  getTodayMood,
  saveWeather,
  loadWeatherHistory,
  getTodayWeather,
  loadAllSeries,
  saveSeries,
  deleteSeries,
  incrementEpisodeCount,
  updateSeriesLastOptions,
  updateSeriesTitle,
  saveActiveSeriesId,
  loadActiveSeriesId,
  loadAllNovels,
  loadNovels,
  saveNovel,
  deleteNovel,
  loadAllWorldBibles,
  loadWorldBible,
  saveWorldBible,
  mergeCharactersIntoWorldBible,
  loadAllStoryBibles,
  loadStoryBibles,
  saveStoryBible,
  clearAll,
} from './supabase/db';

import {
  saveMood as _saveMood,
  getTodayMood as _getTodayMood,
  loadMoodHistory as _loadMoodHistory,
  saveNovel as _saveNovel,
  loadAllNovels as _loadAllNovels,
  deleteNovel as _deleteNovel,
} from './supabase/db';

// ─── moodStorage (NovelViewer/MoodSelector 호환용) ──────────────────────────
export const moodStorage = {
  async saveMood(emoji: MoodEmoji): Promise<void> {
    await _saveMood({
      date: new Date().toISOString().slice(0, 10),
      emoji,
      label: MOOD_MAP[emoji].label,
    });
  },
  getTodayMood: _getTodayMood,
  loadMoodHistory: _loadMoodHistory,
};

// ─── novelStorage (NovelViewer 호환용) ──────────────────────────────────────
export const novelStorage = {
  async save({ title, content, config, baseMood }: {
    title: string;
    content: string;
    config: NovelConfig;
    baseMood: string;
  }): Promise<NovelRecord> {
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
    await _saveNovel(record);
    return record;
  },
  loadAll: _loadAllNovels,
  delete: _deleteNovel,
};