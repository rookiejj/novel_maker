'use client';

import { createClient } from '@/lib/supabase/client';

export default function Header() {
  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    // 하드 리로드로 완전히 새 페이지를 로드한다.
    // router.refresh()는 서버 컴포넌트만 다시 렌더하고 JS 힙은 남아 있어서,
    // Google GSI가 내부적으로 캐시한 nonce/initialize 상태 때문에
    // 재로그인 시 Nonces mismatch 에러가 난다. 하드 리로드로 완전 리셋.
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
        <button
          onClick={handleLogout}
          className="text-[11px] font-medium text-brand-400 hover:text-brand-600
                     px-2.5 py-1 rounded-md hover:bg-brand-50 transition-colors"
        >
          로그아웃
        </button>
      </div>
    </header>
  );
}