import type { MoodRecord, NovelRecord, MoodType } from './types';
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
  MOODS:  'story_moods_v1',
  NOVELS: 'story_novels_v1',
} as const;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function safeRead<T>(key: string): T[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? '[]') as T[];
  } catch {
    return [];
  }
}

function safeWrite<T>(key: string, data: T[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Mood Storage ─────────────────────────────────────────────────────────────

export const moodStorage = {
  getAll(): MoodRecord[] {
    return safeRead<MoodRecord>(KEYS.MOODS).sort((a, b) => b.timestamp - a.timestamp);
  },

  getRecent(days = 7): MoodRecord[] {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return this.getAll().filter(r => r.timestamp >= cutoff);
  },

  getTodayMood(): MoodRecord | null {
    const today = getToday();
    return this.getAll().find(r => r.date === today) ?? null;
  },

  saveMood(mood: MoodType): MoodRecord {
    const today = getToday();
    const all = safeRead<MoodRecord>(KEYS.MOODS);

    // Replace today's if already exists
    const filtered = all.filter(r => r.date !== today);
    const record: MoodRecord = { id: uuidv4(), mood, date: today, timestamp: Date.now() };

    safeWrite(KEYS.MOODS, [record, ...filtered]);
    return record;
  },
};

// ─── Novel Storage ────────────────────────────────────────────────────────────

export const novelStorage = {
  getAll(): NovelRecord[] {
    return safeRead<NovelRecord>(KEYS.NOVELS).sort((a, b) => b.createdAt - a.createdAt);
  },

  getById(id: string): NovelRecord | null {
    return this.getAll().find(r => r.id === id) ?? null;
  },

  save(record: Omit<NovelRecord, 'id' | 'createdAt'>): NovelRecord {
    const all = safeRead<NovelRecord>(KEYS.NOVELS);
    const novel: NovelRecord = { ...record, id: uuidv4(), createdAt: Date.now() };
    safeWrite(KEYS.NOVELS, [novel, ...all]);
    return novel;
  },

  delete(id: string): void {
    const filtered = safeRead<NovelRecord>(KEYS.NOVELS).filter(r => r.id !== id);
    safeWrite(KEYS.NOVELS, filtered);
  },
};