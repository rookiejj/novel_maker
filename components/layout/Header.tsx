'use client';

import { createClient } from '@/lib/supabase/client';

interface Props {
  isAuthenticated: boolean;
}

export default function Header({ isAuthenticated }: Props) {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // 하드 리로드로 JS 힙을 완전히 리셋한다.
    // (Google OAuth / Supabase 세션 관련 전역 상태 정리)
    window.location.href = '/';
  }

  return (
    <header className="sticky top-0 z-40 border-b border-brand-100 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-xl items-center justify-between px-4 py-3.5">
        <div className="flex items-baseline gap-2.5">
          <h1 className="text-lg font-bold tracking-tight text-brand-700">한편</h1>
          <span className="text-[11px] font-medium text-brand-300 tracking-wide">
            아무도 읽지 않는 이야기를 씁니다
          </span>
        </div>
        {isAuthenticated && (
          <button
            onClick={handleLogout}
            className="text-[11px] font-medium text-brand-400 hover:text-brand-600
                       px-2.5 py-1 rounded-md hover:bg-brand-50 transition-colors"
          >
            로그아웃
          </button>
        )}
      </div>
    </header>
  );
}
