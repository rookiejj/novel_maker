'use client';

import { useState } from 'react';
import { MOOD_MAP, type MoodType } from '@/lib/types';
import { moodStorage } from '@/lib/storage';
import { cn } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';

interface Props {
  todayMood: MoodType | null;
  onSelect: (mood: MoodType) => void;
}

export default function MoodSelector({ todayMood, onSelect }: Props) {
  const [selected, setSelected] = useState<MoodType | null>(todayMood);
  const [saved,    setSaved]    = useState(!!todayMood);

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
    <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
      <p className="mb-0.5 text-[11px] font-semibold uppercase tracking-widest text-brand-300">
        Mood
      </p>
      <p className="mb-4 text-sm font-medium text-slate-500">
        {saved
          ? <><TwEmoji emoji={MOOD_MAP[selected!].emoji} size={16} className="mr-1 align-middle" />오늘은 <span className="text-brand-600 font-semibold">"{MOOD_MAP[selected!].label}"</span> 기분이군요.</>
          : '지금 기분을 골라보세요.'}
      </p>

      <div className="grid grid-cols-4 gap-2">
        {(Object.entries(MOOD_MAP) as [MoodType, typeof MOOD_MAP[MoodType]][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            className={cn(
              'flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 transition-all duration-150',
              selected === key
                ? `${val.tw} scale-105 shadow-md`
                : 'border-brand-50 bg-brand-50/50 text-slate-400 hover:border-brand-200 hover:bg-brand-50',
            )}
          >
            <TwEmoji emoji={val.emoji} size={28} />
            <span className="text-[11px] font-medium leading-none">{val.label}</span>
          </button>
        ))}
      </div>

      {selected && !saved && (
        <button
          onClick={handleSave}
          className="mt-4 w-full rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white
                     transition hover:bg-brand-700 active:scale-[0.98]"
        >
          기록하기
        </button>
      )}
    </div>
  );
}