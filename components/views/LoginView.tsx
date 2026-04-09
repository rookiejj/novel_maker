'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface CredentialResponse {
  credential: string;
  select_by?: string;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: CredentialResponse) => void;
            nonce?: string;
            use_fedcm_for_prompt?: boolean;
            auto_select?: boolean;
          }) => void;
          renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

// ─── 인앱 브라우저 감지 ────────────────────────────────────────────────────────
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
  if (/KAKAOTALK/i.test(ua))            name = '카카오톡';
  else if (/FBAN|FBAV|FB_IAB/i.test(ua)) name = 'Facebook';
  else if (/Instagram/i.test(ua))        name = 'Instagram';
  else if (/Line/i.test(ua))             name = 'LINE';
  else if (/NAVER/i.test(ua))            name = '네이버';
  else if (/Daum/i.test(ua))             name = '다음';
  else if (/; wv\)/i.test(ua))           name = '인앱 브라우저'; // 일반 Android WebView

  return { isInApp: name !== null, isAndroid, isIOS, name };
}

export default function LoginView() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const rawNonceRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(
    // 이전 마운트에서 이미 GSI 스크립트가 로드돼 있으면 true로 시작.
    // (로그아웃 → router.refresh() 시 <Script>가 재마운트되지만
    //  strategy="afterInteractive"라 onLoad가 다시 호출되지 않기 때문)
    typeof window !== 'undefined' && !!window.google?.accounts?.id,
  );
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [inAppInfo, setInAppInfo] = useState<InAppInfo | null>(null);

  // 인앱 브라우저 감지 및 처리
  useEffect(() => {
    const info = detectInAppBrowser(navigator.userAgent);
    setInAppInfo(info);

    if (!info.isInApp) return;

    // 안드로이드: intent:// URL로 Chrome 강제 실행
    if (info.isAndroid) {
      const url = window.location.href.replace(/^https?:\/\//, '');
      window.location.href =
        `intent://${url}#Intent;scheme=https;package=com.android.chrome;end`;
    }
    // iOS: 안내문구만 표시 (아래 JSX에서 처리)
  }, []);

  const generateNonce = useCallback(async (): Promise<{ raw: string; hashed: string }> => {
    const randomBytes = crypto.getRandomValues(new Uint8Array(32));
    const raw = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(raw));
    const hashed = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    return { raw, hashed };
  }, []);

  const handleCredential = useCallback(async (response: CredentialResponse) => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
        nonce: rawNonceRef.current ?? undefined,
      });
      if (error) {
        console.error('[Supabase signInWithIdToken]', error);
        setErrorMsg(`로그인 실패: ${error.message}`);
        return;
      }
      // 루트에서 통합 렌더 중이므로, 서버가 다시 세션을 읽어
      // HomeView를 내려보내도록 refresh만 호출한다.
      router.refresh();
    } catch (err) {
      console.error('[GSI callback]', err);
      setErrorMsg('로그인 중 오류가 발생했습니다.');
    }
  }, [router]);

  // GSI 초기화 (인앱 브라우저에서는 실행 안 함)
  useEffect(() => {
    if (!scriptLoaded) return;
    if (!buttonRef.current) return;
    if (inAppInfo?.isInApp) return; // 인앱이면 스킵
    if (!window.google) {
      setErrorMsg('Google 스크립트 로드 실패');
      return;
    }

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setErrorMsg('환경변수 NEXT_PUBLIC_GOOGLE_CLIENT_ID 미설정');
      return;
    }

    (async () => {
      const { raw, hashed } = await generateNonce();
      rawNonceRef.current = raw;

      window.google!.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredential,
        nonce: hashed,
        use_fedcm_for_prompt: true,
        auto_select: false,
      });

      window.google!.accounts.id.renderButton(buttonRef.current!, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'pill',
        logo_alignment: 'left',
        locale: 'ko',
        width: 280,
      });

      window.google!.accounts.id.prompt();
    })();
  }, [scriptLoaded, generateNonce, handleCredential, inAppInfo]);

  // URL 복사 (iOS 안내용)
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

  // ─── 안드로이드 인앱 브라우저: Chrome으로 리다이렉트 중 ──────────────────────
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
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setErrorMsg('Google 스크립트 로드 실패')}
      />
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-bold text-brand-700">한편</h1>
          <p className="mt-2 text-sm text-slate-500">
            아무도 읽지 않는 이야기를 씁니다
          </p>
        </div>

        <div className="flex justify-center min-h-[44px]">
          <div ref={buttonRef} />
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