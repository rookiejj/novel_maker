'use client';

import { MOOD_MAP, type MoodRecord } from '@/lib/types';
import TwEmoji from '@/components/ui/TwEmoji';

interface Props {
  records: MoodRecord[];
}

export default function MoodHistory({ records }: Props) {
  if (records.length === 0) return null;

  return (
    <div className="mt-3 flex items-center gap-2 px-1">
      <span className="text-[11px] font-medium text-brand-300 uppercase tracking-widest">최근</span>
      <div className="flex items-center gap-1">
        {records.slice(0, 7).map(r => (
          <span
            key={r.id}
            title={`${r.date} — ${MOOD_MAP[r.mood].label}`}
            className="opacity-70 hover:opacity-100 transition-opacity"
          >
            <TwEmoji emoji={MOOD_MAP[r.mood].emoji} size={18} />
          </span>
        ))}
      </div>
    </div>
  );
}