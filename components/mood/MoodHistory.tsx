'use client';

import { MOOD_MAP, type MoodRecord } from '@/lib/types';

interface Props {
  records: MoodRecord[];
}

export default function MoodHistory({ records }: Props) {
  if (records.length === 0) return null;

  return (
    <div className="mt-3 flex items-center gap-1.5">
      <span className="text-xs text-stone-400">최근</span>
      {records.slice(0, 7).map(r => (
        <span
          key={r.id}
          title={`${r.date} — ${MOOD_MAP[r.mood].label}`}
          className="text-lg leading-none"
        >
          {MOOD_MAP[r.mood].emoji}
        </span>
      ))}
    </div>
  );
}