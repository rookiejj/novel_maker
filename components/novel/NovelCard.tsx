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
  const preview = novel.content.slice(0, 100).trim() + (novel.content.length > 100 ? '…' : '');

  return (
    <article
      onClick={() => !confirming && onRead(novel)}
      className="group relative rounded-2xl border border-brand-100 bg-white p-4 shadow-sm
                 transition-all hover:border-brand-200 hover:shadow-md cursor-pointer"
    >
      {/* 메타 + 날짜 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <TwEmoji emoji={GENRE_MAP[novel.config.genre].icon} size={13} />
          <span className="text-xs font-medium text-slate-500">{GENRE_MAP[novel.config.genre].label}</span>
          <span className="text-xs text-slate-300">·</span>
          <span className="text-xs text-slate-400">{ATMOSPHERE_MAP[novel.config.atmosphere].label}</span>
          <span className="text-xs text-slate-300">·</span>
          <TwEmoji emoji={MOOD_MAP[novel.baseMood].emoji} size={13} />
        </div>
        <span className="shrink-0 text-xs text-slate-300">{formatRelativeDate(novel.createdAt)}</span>
      </div>

      {/* 제목 + 미리보기 */}
      <h3 className="mt-2 text-[15px] font-semibold text-slate-900 leading-snug tracking-tight">
        {novel.title}
      </h3>
      <p className="mt-1 text-xs text-slate-400 leading-relaxed">{preview}</p>

      {/* 삭제 버튼 — hover 시 우측 하단에 표시 */}
      <div
        className="absolute bottom-3 right-3"
        onClick={e => e.stopPropagation()} // 카드 클릭과 분리
      >
        {confirming ? (
          <div className="flex gap-1.5">
            <button
              onClick={() => { onDelete(novel.id); setConfirming(false); }}
              className="rounded-lg bg-rose-500 px-2.5 py-1 text-xs font-medium text-white hover:bg-rose-400"
            >
              삭제
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs text-slate-500 bg-white"
            >
              취소
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="rounded-lg border border-slate-100 px-2.5 py-1 text-xs text-slate-400
                       opacity-0 transition-opacity group-hover:opacity-100 bg-white"
          >
            삭제
          </button>
        )}
      </div>
    </article>
  );
}