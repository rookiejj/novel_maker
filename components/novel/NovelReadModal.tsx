'use client';

import { useEffect, useRef, type MouseEvent } from 'react';
import type { NovelRecord, Series } from '@/lib/types';
import { GENRE_MAP, ATMOSPHERE_MAP, MOOD_MAP } from '@/lib/types';
import { formatDate } from '@/lib/utils';
import TwEmoji from '@/components/ui/TwEmoji';
import { useModalBackDismiss } from '@/lib/useModalBackDismiss';

interface Props {
  novel:   NovelRecord;
  /** 현재 시리즈(타이틀 표시용). 없으면 시리즈 헤더 숨김 */
  series?: Series | null;
  /** 같은 시리즈의 소설 목록 (created_at DESC 기준). 순번·네비게이션용 */
  seriesNovels?: NovelRecord[];
  /** 이전/다음 편으로 이동. HomeView가 readingNovel 상태를 교체한다 */
  onNavigate?: (novel: NovelRecord) => void;
  onClose: () => void;
  onRetryIllustration?: (id: string) => void;
}

export default function NovelReadModal({
  novel, series, seriesNovels, onNavigate, onClose, onRetryIllustration,
}: Props) {
  const dismiss = useModalBackDismiss(onClose);

  // 스크롤 컨테이너 ref — 편을 넘길 때 맨 위로 리셋
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [novel.id]);

  const hasIllustration = !!novel.illustrationUrl;
  const isGenerating =
    novel.illustrationStatus === 'pending' || novel.illustrationStatus === 'generating';
  const isFailed = novel.illustrationStatus === 'failed';

  // 모달 콘텐츠 영역 아무 데나 클릭해도 닫히게 한다.
  // 단, 사용자가 텍스트를 드래그 선택한 상태(복사 중)면 닫지 않는다.
  //
  // ★ stopPropagation 필수 ★
  // 바깥 backdrop에도 onClick={dismiss}가 걸려 있어서, 버블링을 막지 않으면
  // 콘텐츠 탭 한 번에 dismiss()가 두 번 호출된다. 두 번째 dismiss()는 첫
  // 번째의 history.back()이 popstate를 발생시키기 전 타이밍이라
  // pushedRef/consumedRef 상태가 "아직 엔트리 있음"으로 읽혀 또 back()을
  // 호출하고, 결과적으로 안드로이드 크롬에서 두 스텝 뒤로 가버려
  // 로그인 콜백 페이지로 이동하는 버그가 발생한다. iOS Safari는 타이밍이
  // 달라 증상이 드러나지 않지만 잠재적으로 동일 문제.
  //
  // 내부 인터랙티브 요소(× 버튼, 재시도 버튼, 네비게이션 푸터)는 각자
  // stopPropagation으로 이 핸들러까지 이벤트가 올라오지 않도록 이미 막혀 있다.
  const handleContentClick = (e: MouseEvent) => {
    e.stopPropagation();
    if (typeof window !== 'undefined') {
      const selection = window.getSelection();
      if (selection && selection.toString().length > 0) {
        return;
      }
    }
    dismiss();
  };

  // ─── 순번 & 네비게이션 계산 ──────────────────────────────────────────────
  //
  // seriesNovels는 loadNovels()가 created_at DESC로 반환한 배열이다.
  // 따라서 배열의 index는 "최신 → 오래된" 순이고, 사용자에게 보여줄
  // "N번째 편" 표기는 역순이어야 자연스럽다.
  //
  //   seriesNovels = [5편, 4편, 3편, 2편, 1편]     (DESC)
  //   episodeNumber = seriesNovels.length - index
  //     index=0 → 5편, index=4 → 1편
  //
  // 이전편(더 과거 화차)은 index + 1, 다음편(더 미래 화차)은 index - 1.
  const list = seriesNovels ?? [];
  const currentIndex = list.findIndex(n => n.id === novel.id);
  const total = list.length;
  const episodeNumber = currentIndex >= 0 ? total - currentIndex : null;

  const prevNovel = currentIndex >= 0 && currentIndex < total - 1
    ? list[currentIndex + 1]
    : null;
  const nextNovel = currentIndex > 0
    ? list[currentIndex - 1]
    : null;

  const canNavigate = !!onNavigate && total > 1 && currentIndex >= 0;

  function handleNav(target: NovelRecord | null) {
    if (!target || !onNavigate) return;
    onNavigate(target);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center
                 bg-slate-900/60 p-4 pt-8 backdrop-blur-sm"
      onClick={dismiss}
    >
      <div
        className="modal-max-h flex w-full max-w-xl flex-col
                   rounded-3xl border border-brand-100 bg-white shadow-2xl overflow-hidden"
        onClick={handleContentClick}
      >
        {/* 헤더 — 시리즈 타이틀 + 편 정보 (고정) */}
        <div className="border-b border-slate-100 px-5 py-3 shrink-0">
          {/* 상단: 시리즈 타이틀 + 편 순번 + 닫기 */}
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {series && (
                <div className="flex items-center gap-1.5">
                  <TwEmoji emoji={GENRE_MAP[series.genre].icon} size={13} />
                  <p className="truncate text-[11px] font-semibold text-brand-500
                                uppercase tracking-wider">
                    {series.title}
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={e => { e.stopPropagation(); dismiss(); }}
              className="text-slate-300 hover:text-slate-500 text-xl leading-none transition-colors shrink-0"
            >
              ×
            </button>
          </div>

          {/* 하단: 장르·분위기·기분·날짜 */}
          <div className="mt-1.5 flex items-center gap-2 text-xs text-slate-400">
            <span>{ATMOSPHERE_MAP[novel.config.atmosphere].label}</span>
            <span>·</span>
            <TwEmoji emoji={MOOD_MAP[novel.baseMood].emoji} size={13} />
            <span>·</span>
            <span>{formatDate(novel.createdAt)}</span>
          </div>
        </div>

        {/* 스크롤 컨테이너 */}
        <div ref={scrollBodyRef} className="flex-1 overflow-y-auto overscroll-contain">
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
                <div className="flex h-full w-full items-center justify-center bg-rose-50/30">
                  <div className="flex flex-col items-center gap-3 px-6 text-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full
                                    bg-rose-100 text-rose-400 text-lg">!</div>
                    <p className="text-xs text-rose-400">일러스트 생성에 실패했어요</p>
                    {onRetryIllustration && (
                      <button
                        onClick={e => { e.stopPropagation(); onRetryIllustration(novel.id); }}
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

        {/* 네비게이션 푸터 (고정) — 시리즈 내 여러 편이 있을 때만 노출 */}
        {canNavigate && (
          <div
            className="flex items-center justify-between gap-2 border-t border-slate-100
                       bg-white px-3 py-2 shrink-0"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={() => handleNav(prevNovel)}
              disabled={!prevNovel}
              className={`flex-1 flex items-center justify-center gap-1 rounded-xl px-3 py-2
                          text-xs font-semibold transition-all
                          ${prevNovel
                            ? 'text-brand-600 hover:bg-brand-50 active:scale-[0.98]'
                            : 'text-slate-300 cursor-not-allowed'}`}
            >
              <span aria-hidden>←</span>
              <span>이전 편</span>
            </button>

            <span className="text-[11px] font-medium text-slate-400 px-2 shrink-0">
              {episodeNumber}/{total}
            </span>

            <button
              onClick={() => handleNav(nextNovel)}
              disabled={!nextNovel}
              className={`flex-1 flex items-center justify-center gap-1 rounded-xl px-3 py-2
                          text-xs font-semibold transition-all
                          ${nextNovel
                            ? 'text-brand-600 hover:bg-brand-50 active:scale-[0.98]'
                            : 'text-slate-300 cursor-not-allowed'}`}
            >
              <span>다음 편</span>
              <span aria-hidden>→</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}