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
            {series.map(s => {
              // 완결 여부 판정: episodeCount가 totalEpisodes에 도달했는가.
              // 홈 화면의 시리즈 카드와 동일한 기준을 적용해 일관성 유지.
              const isComplete = s.episodeCount >= s.totalEpisodes;
              const isActive   = s.id === activeId;

              return (
                <button
                  key={s.id}
                  onClick={() => onSelect(s)}
                  className={`w-full flex items-center justify-between rounded-2xl border p-4
                    text-left transition-all
                    ${isActive
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
                        {` · ${s.episodeCount}/${s.totalEpisodes}편`}
                      </p>
                    </div>
                  </div>

                  {/* 배지: 완결 > 진행 중 (활성) > 없음 */}
                  {isComplete ? (
                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50
                                     px-2.5 py-1 rounded-full border border-emerald-100">
                      완결
                    </span>
                  ) : isActive ? (
                    <span className="text-[11px] font-semibold text-brand-500 bg-brand-50
                                     px-2.5 py-1 rounded-full border border-brand-100">
                      진행 중
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
