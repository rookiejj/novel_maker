'use client';

import { useEffect, useRef, useCallback } from 'react';

/**
 * 모달 공통 동작:
 *   1) 모바일 "뒤로 가기"를 가로채 모달만 닫기
 *   2) 모달이 열려있는 동안 body 스크롤을 잠가 뒷배경이 움직이지 않게 함
 *
 * 사용법:
 *   const dismiss = useModalBackDismiss(onClose);
 *   // 내부 X 버튼/배경 클릭에서는 onClose 대신 dismiss() 호출
 *
 * body 스크롤 잠금 전략 (position: fixed 기반)
 * ────────────────────────────────────────────
 * 단순히 `body { overflow: hidden }`만 걸면 iOS Safari/모바일 Chrome에서
 * 현재 스크롤 위치가 유지되지 못하거나 fixed 레이어가 밀리는 버그가 있다.
 *
 * 특히 페이지를 한참 아래로 스크롤한 상태에서 모달을 열면, overflow:hidden은
 * 스크롤바를 지울 뿐 스크롤 위치를 고정하지 못해, 뷰포트 계산(100dvh 등)과
 * 맞물려 모달이 "원래 스크롤 높이만큼 밀려난" 위치에서 렌더되는 현상이 생긴다.
 * → 모달 하단이 화면 밖으로 잘려 보임.
 *
 * 정석 해법은 body를 position:fixed로 만들면서 top 값으로 기존 스크롤 위치를
 * 상쇄하는 것. 그러면 body는 시각적으로 제자리에 있고, 실제로는 문서 스크롤이
 * 0으로 리셋되어 뒷배경이 완벽히 멈추며, fixed 모달도 viewport 기준으로
 * 정확히 렌더된다. 모달이 닫힐 때 position:fixed를 풀고 window.scrollTo로
 * 원래 위치를 복원한다.
 *
 * 참조 카운팅으로 중첩 모달에서도 안전하게 동작. (현 앱 구조상 발생 안 하지만
 * 안전장치.)
 *
 * 뒤로 가기 가로채기 (popstate)
 * ────────────────────────────
 * pushState로 더미 엔트리를 쌓고 popstate를 듣는다. cleanup에서는 리스너만
 * 떼고 history.back()은 호출하지 않는다 — Strict Mode 이중 실행에서 "모달이
 * 열리자마자 자기 자신을 닫는" 버그를 피하기 위함. 내부 수동 닫기는 dismiss()
 * 가 history.back()을 호출하고, popstate 리스너가 onClose를 트리거하는 단일
 * 경로로 수렴.
 */

// ─── body 스크롤 잠금용 모듈 레벨 상태 ────────────────────────────────────
let lockCount = 0;
// 잠금 시 저장해두는 원복 정보
let saved = {
  scrollY:     0,
  bodyPosition: '',
  bodyTop:      '',
  bodyLeft:     '',
  bodyRight:    '',
  bodyWidth:    '',
};

function lockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) {
    const body = document.body;
    saved = {
      scrollY:      window.scrollY,
      bodyPosition: body.style.position,
      bodyTop:      body.style.top,
      bodyLeft:     body.style.left,
      bodyRight:    body.style.right,
      bodyWidth:    body.style.width,
    };
    // body를 viewport에 고정하면서 원래 스크롤 위치를 top 상쇄로 유지
    body.style.position = 'fixed';
    body.style.top      = `-${saved.scrollY}px`;
    body.style.left     = '0';
    body.style.right    = '0';
    body.style.width    = '100%';
  }
  lockCount += 1;
}

function unlockBodyScroll() {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;
  lockCount -= 1;
  if (lockCount === 0) {
    const body = document.body;
    body.style.position = saved.bodyPosition;
    body.style.top      = saved.bodyTop;
    body.style.left     = saved.bodyLeft;
    body.style.right    = saved.bodyRight;
    body.style.width    = saved.bodyWidth;
    // 원래 스크롤 위치로 복원
    // (position:fixed를 풀면 스크롤이 0으로 튀므로 직후에 복원 필요)
    window.scrollTo(0, saved.scrollY);
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
      unlockBodyScroll();
    };
  }, []);

  const dismiss = useCallback(() => {
    if (typeof window === 'undefined') {
      onCloseRef.current();
      return;
    }
    if (pushedRef.current && !consumedRef.current) {
      window.history.back();
    } else {
      onCloseRef.current();
    }
  }, []);

  return dismiss;
}