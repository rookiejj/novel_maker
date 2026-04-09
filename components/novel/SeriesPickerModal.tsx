'use client';

import type { Series } from '@/lib/types';
import { GENRE_MAP } from '@/lib/types';
import TwEmoji from '@/components/ui/TwEmoji';
import { useModalBackDismiss } from '@/lib/useModalBackDismiss';

interface Props {
  series:       Series[];
  activeId?:    string;
  onSelect:     (series: Series) => void;
  onClose:      () => void;
}

export default function SeriesPickerModal({ series, activeId, onSelect, onClose }: Props) {
  // 뒤로 가기 가로채기 + body 스크롤 잠금
  const dismiss = useModalBackDismiss(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center
                 bg-slate-900/50 backdrop-blur-sm"
      onClick={dismiss}
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

          {/* overscroll-contain: 리스트 스크롤 끝에 도달해도 스크롤 이벤트가
              전파되지 않게 방지 (백업 방어선).
              주된 방어는 훅이 잠근 body overflow:hidden. */}
          <div className="space-y-2 max-h-72 overflow-y-auto overscroll-contain">
            {series.map(s => {
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