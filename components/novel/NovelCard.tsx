'use client';

import { useState } from 'react';
import type { NovelRecord } from '@/lib/types';
import { GENRE_MAP, ATMOSPHERE_MAP, MOOD_MAP } from '@/lib/types';
import { formatRelativeDate } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';

interface Props {
  novel:    NovelRecord;
  onRead:   (novel: NovelRecord) => void;
  onDelete: (id: string) => void;
}

export default function NovelCard({ novel, onRead, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const preview = novel.content.slice(0, 90).trim() + (novel.content.length > 90 ? '…' : '');

  return (
    <article className="group rounded-2xl border border-brand-100 bg-white p-4 shadow-sm
                        transition-all hover:border-brand-200 hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TwEmoji emoji={GENRE_MAP[novel.config.genre].icon} size={14} />
          <span className="text-xs font-medium text-slate-500">{GENRE_MAP[novel.config.genre].label}</span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">{ATMOSPHERE_MAP[novel.config.atmosphere].label}</span>
          <span className="text-xs text-slate-300">·</span>
          <TwEmoji emoji={MOOD_MAP[novel.baseMood].emoji} size={14} />
        </div>
        <span className="shrink-0 text-xs text-slate-300">{formatRelativeDate(novel.createdAt)}</span>
      </div>

      <h3 className="mt-2 text-[15px] font-semibold text-slate-900 leading-snug tracking-tight">
        {novel.title}
      </h3>
      <p className="mt-1 text-xs text-slate-400 leading-relaxed">{preview}</p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onRead(novel)}
          className="flex-1 rounded-lg bg-brand-600 py-1.5 text-xs font-semibold text-white
                     transition hover:bg-brand-700"
        >
          읽기
        </button>

        {confirming ? (
          <>
            <button
              onClick={() => { onDelete(novel.id); setConfirming(false); }}
              className="rounded-lg bg-rose-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-rose-400"
            >
              삭제
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500"
            >
              취소
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-slate-100 px-3 py-1.5 text-xs text-slate-400
                       opacity-0 transition group-hover:opacity-100"
          >
            삭제
          </button>
        )}
      </div>
    </article>
  );
}