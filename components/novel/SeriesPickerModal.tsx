'use client';

import type { Series } from '@/lib/types';
import { GENRE_MAP } from '@/lib/types';
import TwEmoji from '@/components/ui/TwEmoji';

interface Props {
  series:       Series[];
  activeId?:    string;
  onSelect:     (series: Series) => void;
  onClose:      () => void;
}

export default function SeriesPickerModal({ series, activeId, onSelect, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-t-3xl bg-white pb-8 pt-3 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* 드래그 핸들 */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-slate-200" />

        <div className="px-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-400 uppercase tracking-widest">
            시리즈 선택
          </h2>

          <div className="space-y-2 max-h-72 overflow-y-auto">
            {series.map(s => (
              <button
                key={s.id}
                onClick={() => onSelect(s)}
                className={`w-full flex items-center justify-between rounded-2xl border p-4
                  text-left transition-all
                  ${s.id === activeId
                    ? 'border-brand-300 bg-brand-50'
                    : 'border-slate-100 bg-white hover:border-brand-200 hover:bg-brand-50/50'}`}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
                    <TwEmoji emoji={GENRE_MAP[s.genre].icon} size={22} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{s.title}</p>
                    <p className="text-xs text-slate-400">
                      {GENRE_MAP[s.genre].label}
                      {s.protagonistName && ` · ${s.protagonistName}`}
                      {` · ${s.episodeCount}편`}
                    </p>
                  </div>
                </div>
                {s.id === activeId && (
                  <span className="text-xs font-semibold text-brand-500">진행 중</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
