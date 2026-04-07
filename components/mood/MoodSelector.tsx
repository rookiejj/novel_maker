'use client';

import { useState } from 'react';
import { MOOD_MAP, type MoodType } from '@/lib/types';
import { moodStorage } from '@/lib/storage';
import { cn } from '@/lib/utils';

interface Props {
  todayMood: MoodType | null;
  onSelect: (mood: MoodType) => void;
}

export default function MoodSelector({ todayMood, onSelect }: Props) {
  const [selected, setSelected] = useState<MoodType | null>(todayMood);
  const [saved, setSaved] = useState(!!todayMood);

  function handleSelect(mood: MoodType) {
    setSelected(mood);
    setSaved(false);
  }

  function handleSave() {
    if (!selected) return;
    moodStorage.saveMood(selected);
    setSaved(true);
    onSelect(selected);
  }

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <p className="mb-1 text-xs font-medium uppercase tracking-widest text-stone-400">
        오늘의 기분
      </p>
      <p className="mb-4 text-sm text-stone-500">
        {saved
          ? `오늘은 "${MOOD_MAP[selected!].label}" 기분이군요.`
          : '지금 기분을 골라보세요.'}
      </p>

      <div className="grid grid-cols-4 gap-2">
        {(Object.entries(MOOD_MAP) as [MoodType, typeof MOOD_MAP[MoodType]][]).map(
          ([key, val]) => (
            <button
              key={key}
              onClick={() => handleSelect(key)}
              className={cn(
                'flex flex-col items-center gap-1 rounded-xl border-2 py-3 transition-all duration-150',
                selected === key
                  ? `${val.tw} scale-105 shadow`
                  : 'border-stone-100 bg-stone-50 text-stone-400 hover:border-stone-300',
              )}
            >
              <span className="text-2xl leading-none">{val.emoji}</span>
              <span className="text-[11px] font-medium">{val.label}</span>
            </button>
          ),
        )}
      </div>

      {selected && !saved && (
        <button
          onClick={handleSave}
          className="mt-4 w-full rounded-xl bg-stone-800 py-2.5 text-sm font-medium text-white transition hover:bg-stone-700 active:scale-95"
        >
          저장
        </button>
      )}
    </div>
  );
}