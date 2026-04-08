'use client';

import { createClient } from '@/lib/supabase/client';

export default function LoginPrompt() {
  async function handleLogin() {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
    if (error) console.error('[LoginPrompt]', error);
  }

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-8 shadow-sm text-center space-y-5">
      <div className="space-y-1.5">
        <p className="text-base font-bold text-slate-800">이야기를 시작하려면</p>
        <p className="text-sm text-slate-400">
          로그인하면 어떤 기기에서도<br />오늘의 한 편을 이어갈 수 있어요
        </p>
      </div>
      <button
        onClick={handleLogin}
        className="w-full flex items-center justify-center gap-2.5 rounded-2xl
                   border border-slate-200 bg-white px-5 py-3 text-sm font-semibold
                   text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
      >
        <svg width="16" height="16" viewBox="0 0 18 18">
          <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18"/>
          <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2a4.8 4.8 0 0 1-7.18-2.54H1.83v2.07A8 8 0 0 0 8.98 17"/>
          <path fill="#FBBC05" d="M4.5 10.52a4.8 4.8 0 0 1 0-3.04V5.41H1.83a8 8 0 0 0 0 7.18z"/>
          <path fill="#EA4335" d="M8.98 4.18c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 0 0 1.83 5.4L4.5 7.49a4.77 4.77 0 0 1 4.48-3.31"/>
        </svg>
        Google로 로그인
      </button>
    </div>
  );
}
