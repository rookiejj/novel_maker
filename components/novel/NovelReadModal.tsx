'use client';

import type { NovelRecord } from '@/lib/types';
import { GENRE_MAP, ATMOSPHERE_MAP, MOOD_MAP } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';
import { useModalBackDismiss } from '@/lib/useModalBackDismiss';

interface Props {
  novel:   NovelRecord;
  onClose: () => void;
  onRetryIllustration?: (id: string) => void;
}

export default function NovelReadModal({ novel, onClose, onRetryIllustration }: Props) {
  const dismiss = useModalBackDismiss(onClose);

  const hasIllustration = !!novel.illustrationUrl;
  const isGenerating =
    novel.illustrationStatus === 'pending' || novel.illustrationStatus === 'generating';
  const isFailed = novel.illustrationStatus === 'failed';

  // 구조
  // ────
  // · Backdrop (fixed inset-0, flex center): 스크롤 컨테이너가 아님.
  //   오직 고정된 어두운 덮개 + 중앙 정렬 역할만.
  // · 모달 콘텐츠: max-h로 높이 제한 + 내부에 스크롤 컨테이너를 가짐.
  //   → 스크롤은 오직 모달 본문 영역에서만 발생.
  // · body 스크롤은 훅이 잠가둠 → 마우스를 모달 바깥에 놓아도 뒤 화면 안 움직임.
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center
                 bg-slate-900/60 p-4 pt-16 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="flex w-full max-w-xl max-h-[calc(100vh-5rem)] flex-col
                   rounded-3xl border border-brand-100 bg-white shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 (고정) */}
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 shrink-0">
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
          <button onClick={dismiss} className="text-slate-300 hover:text-slate-500 text-xl leading-none transition-colors">×</button>
        </div>

        {/* 스크롤 컨테이너: 일러스트 + 본문이 이 안에서만 스크롤됨 */}
        <div className="flex-1 overflow-y-auto overscroll-contain">
          {/* 일러스트 */}
          {(hasIllustration || isGenerating || isFailed) && (
            <div className="bg-brand-50/40 aspect-[4/3] w-full overflow-hidden">
              {hasIllustration ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={novel.illustrationUrl!}
                  alt={novel.title}
                  className="h-full w-full object-cover"
                />
              ) : isGenerating ? (
                <div className="flex h-full w-full items-center justify-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
                    <p className="text-xs text-brand-400">일러스트를 그리는 중…</p>
                  </div>
                </div>
              ) : (
                // failed 상태
                <div className="flex h-full w-full items-center justify-center bg-rose-50/30">
                  <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full
                                    bg-rose-100 text-rose-400 text-lg">!</div>
                    <p className="text-xs text-rose-400">일러스트 생성에 실패했어요</p>
                    {onRetryIllustration && (
                      <button
                        onClick={() => onRetryIllustration(novel.id)}
                        className="rounded-xl bg-white border border-rose-200 px-4 py-2
                                   text-xs font-semibold text-rose-500 hover:bg-rose-50
                                   active:scale-[0.98] transition-all shadow-sm"
                      >
                        ↻ 다시 시도
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

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
    </div>
  );
}