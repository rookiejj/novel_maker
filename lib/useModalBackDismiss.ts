'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * 모달 공통 동작을 한데 모은 훅:
 *   1) 모바일 "뒤로 가기"를 가로채 모달만 닫기 (루트로 탈출 방지)
 *   2) 모달이 열려있는 동안 body 스크롤을 잠가서, 뒷배경이 스크롤되지 않게 함
 *
 * 사용법:
 *   const dismiss = useModalBackDismiss(onClose);
 *   // 내부에서 닫을 때는 onClose 대신 dismiss() 호출
 *
 * 설계 포인트
 * ──────────
 * · 뒤로 가기: pushState + popstate 리스너. cleanup은 리스너 제거만 하고
 *   history.back()은 호출하지 않는다. 그래야 Strict Mode 이중 실행에서
 *   "모달이 열리자마자 닫히는" 사이드이펙트가 없음. 내부 수동 닫기는
 *   dismiss()가 history.back()을 호출해 엔트리를 명시적으로 소비하고,
 *   popstate 리스너가 onClose를 트리거하는 단일 경로로 수렴.
 *
 * · body 스크롤 잠금: document.body.style.overflow = 'hidden' 을 건다.
 *   여러 모달이 동시에 열릴 경우(현 앱 구조상 발생 안 하지만)에도 안전하도록
 *   모듈 레벨 카운터로 참조 카운팅하고, 0이 됐을 때만 원래 값으로 복구.
 */

// ─── body 스크롤 잠금용 모듈 레벨 상태 ────────────────────────────────────
let lockCount = 0;
let originalBodyOverflow: string | null = null;

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    originalBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return; // 방어
  lockCount -= 1;
  if (lockCount === 0) {
    document.body.style.overflow = originalBodyOverflow ?? '';
    originalBodyOverflow = null;
  }
}

export function useModalBackDismiss(onClose: () => void): () => void {
  const onCloseRef = useRef(onClose);
  useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

  const pushedRef   = useRef(false);
  const consumedRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // ── body 스크롤 잠금 ───────────────────────────────────────
    lockBodyScroll();

    // ── history 엔트리 + popstate 리스너 ───────────────────────
    try {
      window.history.pushState({ __modal: true }, '');
      pushedRef.current = true;
      consumedRef.current = false;
    } catch {
      /* SSR 경계나 일부 WebView — 뒤로 가기 가로채기만 포기, body 잠금은 유지 */
    }

    const handlePopState = () => {
      consumedRef.current = true;
      onCloseRef.current();
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      // ★ cleanup에서 history.back()을 호출하지 않는다 — Strict Mode 이중
      //   실행에서 "모달이 열리자마자 닫히는" 버그를 피하기 위함.
      //   남은 엔트리는 다음 사용자 네비게이션에서 자연 소비(무해).
      unlockBodyScroll();
    };
  }, []);

  const dismiss = useCallback(() => {
    if (typeof window === 'undefined') {
      onCloseRef.current();
      return;
    }
    if (pushedRef.current && !consumedRef.current) {
      // popstate 리스너가 onClose를 호출할 것
      window.history.back();
    } else {
      onCloseRef.current();
    }
  }, []);

  return dismiss;
}