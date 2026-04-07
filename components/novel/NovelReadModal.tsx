'use client';

import type { NovelRecord } from '@/lib/types';
import { GENRE_MAP, ATMOSPHERE_MAP, MOOD_MAP } from '@/lib/types';
import { formatDate } from '@/lib/utils';

interface Props {
  novel:   NovelRecord;
  onClose: () => void;
}

export default function NovelReadModal({ novel, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/60 p-4 pt-16 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-2xl border border-stone-200 bg-white shadow-2xl">
        {/* Toolbar */}
        <div className="flex items-center justify-between border-b border-stone-100 px-5 py-3">
          <div className="flex items-center gap-2 text-xs text-stone-400">
            <span>{GENRE_MAP[novel.config.genre].icon}</span>
            <span>{GENRE_MAP[novel.config.genre].label}</span>
            <span>·</span>
            <span>{ATMOSPHERE_MAP[novel.config.atmosphere].label}</span>
            <span>·</span>
            <span>{MOOD_MAP[novel.baseMood].emoji}</span>
            <span>·</span>
            <span>{formatDate(novel.createdAt)}</span>
          </div>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-600 text-lg leading-none">×</button>
        </div>

        {/* Body */}
        <div className="px-6 py-6">
          <h1 className="mb-6 font-serif text-2xl font-bold leading-snug text-stone-800">
            {novel.title}
          </h1>
          <div className="prose prose-stone max-w-none font-serif leading-relaxed text-stone-700">
            {novel.content.split('\n').map((para, i) =>
              para.trim() ? <p key={i} className="mb-4">{para}</p> : <br key={i} />,
            )}
          </div>
        </div>
      </div>
    </div>
  );
}