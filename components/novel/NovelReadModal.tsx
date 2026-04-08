'use client';

import type { NovelRecord } from '@/lib/types';
import { GENRE_MAP, ATMOSPHERE_MAP, MOOD_MAP } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';

interface Props {
  novel:   NovelRecord;
  onClose: () => void;
}

export default function NovelReadModal({ novel, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto
                 bg-slate-900/60 p-4 pt-16 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-3xl border border-brand-100 bg-white shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <TwEmoji emoji={GENRE_MAP[novel.config.genre].icon} size={14} />
            <span className="font-medium">{GENRE_MAP[novel.config.genre].label}</span>
            <span>·</span>
            <span>{ATMOSPHERE_MAP[novel.config.atmosphere].label}</span>
            <span>·</span>
            <TwEmoji emoji={MOOD_MAP[novel.baseMood].emoji} size={14} />
            <span>·</span>
            <span>{formatDate(novel.createdAt)}</span>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-500 text-xl leading-none transition-colors">×</button>
        </div>
        <div className="px-6 py-6">
          <h1 className="mb-6 font-serif text-2xl font-bold leading-snug text-slate-900">{novel.title}</h1>
          <div className="prose prose-slate max-w-none font-serif leading-relaxed text-slate-700">
            {novel.content.split('\n').map((para, i) =>
              para.trim() ? <p key={i} className="mb-4">{para}</p> : <br key={i} />,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}