'use client';

import { useState } from 'react';
import type { NovelRecord } from '@/lib/types';
import { GENRE_MAP, ATMOSPHERE_MAP, MOOD_MAP } from '@/lib/types';
import { formatRelativeDate } from '@/lib/utils';

interface Props {
  novel:    NovelRecord;
  onRead:   (novel: NovelRecord) => void;
  onDelete: (id: string) => void;
}

export default function NovelCard({ novel, onRead, onDelete }: Props) {
  const [confirming, setConfirming] = useState(false);
  const preview = novel.content.slice(0, 80).trim() + (novel.content.length > 80 ? '…' : '');

  return (
    <article className="group rounded-2xl border border-stone-100 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-xs text-stone-400">
          <span>{GENRE_MAP[novel.config.genre].icon}</span>
          <span>{GENRE_MAP[novel.config.genre].label}</span>
          <span>·</span>
          <span>{ATMOSPHERE_MAP[novel.config.atmosphere].label}</span>
          <span>·</span>
          <span>{MOOD_MAP[novel.baseMood].emoji}</span>
        </div>
        <span className="shrink-0 text-xs text-stone-300">
          {formatRelativeDate(novel.createdAt)}
        </span>
      </div>

      <h3 className="mt-2 font-serif text-base font-semibold text-stone-800 leading-snug">
        {novel.title}
      </h3>
      <p className="mt-1 text-xs text-stone-400 leading-relaxed">{preview}</p>

      <div className="mt-3 flex gap-2">
        <button
          onClick={() => onRead(novel)}
          className="flex-1 rounded-lg bg-stone-800 py-1.5 text-xs font-medium text-white transition hover:bg-stone-700"
        >
          읽기
        </button>

        {confirming ? (
          <>
            <button
              onClick={() => { onDelete(novel.id); setConfirming(false); }}
              className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-red-400"
            >
              삭제
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-stone-200 px-3 py-1.5 text-xs text-stone-500"
            >
              취소
            </button>
          </>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-stone-100 px-3 py-1.5 text-xs text-stone-400 opacity-0 transition group-hover:opacity-100"
          >
            삭제
          </button>
        )}
      </div>
    </article>
  );
}