'use client';

import { useState } from 'react';
import { MOOD_MAP, type MoodType } from '@/lib/types';
import { moodStorage } from '@/lib/storage';
import { cn } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';

interface Props {
  todayMood: MoodType | null;
  onSelect:  (mood: MoodType) => void;
}

export default function MoodSelector({ todayMood, onSelect }: Props) {
  const [selected, setSelected] = useState<MoodType | null>(todayMood);

  // 클릭 즉시 저장 (별도 저장 버튼 없음 — 공간 절약)
  function handleSelect(mood: MoodType) {
    setSelected(mood);
    moodStorage.saveMood(mood);
    onSelect(mood);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-semibold text-brand-300 uppercase tracking-widest">
          오늘의 기분
        </p>
        {selected && (
          <p className="text-[11px] text-brand-400 font-medium">
            <TwEmoji emoji={MOOD_MAP[selected].emoji} size={12} className="mr-0.5 align-middle" />
            {MOOD_MAP[selected].label}
          </p>
        )}
      </div>

      <div className="grid grid-cols-8 gap-1">
        {(Object.entries(MOOD_MAP) as [MoodType, typeof MOOD_MAP[MoodType]][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => handleSelect(key)}
            title={val.label}
            className={cn(
              'flex flex-col items-center gap-0.5 py-2 rounded-xl transition-all duration-150',
              selected === key
                ? `ring-2 ${val.tw} scale-105`
                : 'bg-white/60 hover:bg-white hover:scale-105',
            )}
          >
            <TwEmoji emoji={val.emoji} size={22} />
            <span className="text-[9px] font-medium text-slate-500 leading-none">{val.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}