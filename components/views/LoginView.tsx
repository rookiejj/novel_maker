'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

// ─── 인앱 브라우저 감지 ────────────────────────────────────────────────────────
// UA에 명시적인 앱 식별자가 있는 경우만 감지한다. 텔레그램처럼 UA를 위장하는
// 앱은 감지 불가능하지만, Supabase OAuth redirect flow는 대부분의 WebView에서
// 정상 동작하므로 감지 실패해도 결국 로그인은 가능하다.
type InAppInfo = {
  isInApp: boolean;
  isAndroid: boolean;
  isIOS: boolean;
  name: string | null;
};

function detectInAppBrowser(ua: string): InAppInfo {
  const isAndroid = /Android/i.test(ua);
  const isIOS = /iPhone|iPad|iPod/i.test(ua);

  let name: string | null = null;
  if      (/KAKAOTALK/i.test(ua))        name = '카카오톡';
  else if (/FBAN|FBAV|FB_IAB/i.test(ua)) name = 'Facebook';
  else if (/Instagram/i.test(ua))        name = 'Instagram';
  else if (/Line/i.test(ua))             name = 'LINE';
  else if (/NAVER/i.test(ua))            name = '네이버';
  else if (/Daum/i.test(ua))             name = '다음';
  else if (/; wv\)/i.test(ua))           name = '인앱 브라우저'; // 일반 Android WebView

  return { isInApp: name !== null, isAndroid, isIOS, name };
}

export default function LoginView() {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inAppInfo, setInAppInfo] = useState<InAppInfo | null>(null);

  // 인앱 브라우저 감지 + Android는 Chrome으로 자동 전환
  useEffect(() => {
    const info = detectInAppBrowser(navigator.userAgent);
    setInAppInfo(info);

    if (info.isInApp && info.isAndroid) {
      // intent:// 스킴으로 Chrome 강제 실행
      const url = window.location.href.replace(/^https?:\/\//, '');
      window.location.href =
        `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
    }
    // iOS 인앱: 아래 JSX에서 안내문만 표시
  }, []);

  async function handleGoogleLogin() {
    setErrorMsg(null);
    setLoading(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) {
        console.error('[signInWithOAuth]', error);
        setErrorMsg(`로그인 시작 실패: ${error.message}`);
        setLoading(false);
      }
      // 성공 시 브라우저가 구글로 이동하므로 여기선 아무것도 안 함
    } catch (err) {
      console.error('[LoginView] unexpected error:', err);
      setErrorMsg('로그인 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }

  async function handleCopyUrl() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('주소가 복사되었습니다. Safari를 열고 주소창에 붙여넣으세요.');
    } catch {
      alert('복사 실패. 주소창의 URL을 길게 눌러 복사해주세요.');
    }
  }

  // ─── iOS 인앱 브라우저: 안내 화면 ─────────────────────────────────────────
  if (inAppInfo?.isInApp && inAppInfo.isIOS) {
    return (
      <div className="min-h-screen bg-[#F0EEFF] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-6 text-center">
          <div>
            <h1 className="text-2xl font-bold text-brand-700">한편</h1>
            <p className="mt-2 text-sm text-slate-500">
              아무도 읽지 않는 이야기를 씁니다
            </p>
          </div>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-left space-y-3">
            <p className="text-sm font-semibold text-amber-900">
              ⚠️ {inAppInfo.name} 인앱 브라우저에서는 Google 로그인이 제한됩니다
            </p>
            <div className="text-xs text-amber-800 space-y-2 leading-relaxed">
              <p className="font-semibold">Safari에서 열어주세요:</p>
              <ol className="list-decimal pl-4 space-y-1">
                <li>화면 우측 상단(또는 하단)의 <b>⋯</b> 또는 <b>공유</b> 아이콘을 누르세요</li>
                <li>&quot;Safari로 열기&quot; 또는 &quot;기본 브라우저로 열기&quot;를 선택하세요</li>
              </ol>
              <p className="pt-2">또는 아래 버튼으로 주소를 복사한 뒤 Safari에 붙여넣으세요.</p>
            </div>
          </div>

          <button
            onClick={handleCopyUrl}
            className="w-full py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold
                       hover:bg-brand-700 transition-colors shadow-sm"
          >
            주소 복사하기
          </button>
        </div>
      </div>
    );
  }

  // ─── Android 인앱 브라우저: Chrome 전환 중 안내 ──────────────────────────
  if (inAppInfo?.isInApp && inAppInfo.isAndroid) {
    return (
      <div className="min-h-screen bg-[#F0EEFF] flex flex-col items-center justify-center px-6">
        <div className="w-full max-w-sm space-y-4 text-center">
          <h1 className="text-2xl font-bold text-brand-700">한편</h1>
          <p className="text-sm text-slate-500">Chrome으로 이동 중입니다...</p>
          <p className="text-xs text-slate-400">
            자동으로 이동되지 않으면 주소창의 URL을 복사해 Chrome에서 열어주세요.
          </p>
          <button
            onClick={handleCopyUrl}
            className="w-full py-3 rounded-2xl bg-brand-600 text-white text-sm font-semibold
                       hover:bg-brand-700 transition-colors shadow-sm mt-4"
          >
            주소 복사하기
          </button>
        </div>
      </div>
    );
  }

  // ─── 정상 로그인 화면 ───────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#F0EEFF] flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-bold text-brand-700">한편</h1>
          <p className="mt-2 text-sm text-slate-500">
            아무도 읽지 않는 이야기를 씁니다
          </p>
        </div>

        <div className="flex justify-center">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex items-center justify-center gap-3 w-full max-w-[280px]
                       rounded-full border border-slate-200 bg-white px-5 py-3
                       text-sm font-medium text-slate-700 shadow-sm
                       hover:bg-slate-50 active:scale-[0.98]
                       disabled:opacity-60 disabled:cursor-not-allowed
                       transition-all"
          >
            <GoogleIcon />
            <span>{loading ? '이동 중…' : 'Google 계정으로 계속하기'}</span>
          </button>
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-500">{errorMsg}</p>
        )}

        <p className="text-xs text-slate-400">
          로그인하면 어떤 기기에서도 이야기를 이어갈 수 있습니다
        </p>
      </div>
    </div>
  );
}

// 공식 Google "G" 로고
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}
