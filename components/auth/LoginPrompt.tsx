'use client';

import { useRef, useCallback, useEffect, useState } from 'react';
import Script from 'next/script';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface CredentialResponse { credential: string; }

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (r: CredentialResponse) => void;
            nonce?: string;
            use_fedcm_for_prompt?: boolean;
            auto_select?: boolean;
          }) => void;
          renderButton: (el: HTMLElement, opts: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

export default function LoginPrompt() {
  const router      = useRouter();
  const buttonRef   = useRef<HTMLDivElement>(null);
  const rawNonceRef = useRef<string | null>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateNonce = useCallback(async () => {
    const bytes  = crypto.getRandomValues(new Uint8Array(32));
    const raw    = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    const buf    = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
    const hashed = Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    return { raw, hashed };
  }, []);

  const handleCredential = useCallback(async (res: CredentialResponse) => {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: res.credential,
      nonce: rawNonceRef.current ?? undefined,
    });
    if (error) { setError(`로그인 실패: ${error.message}`); return; }
    router.refresh();
  }, [router]);

  useEffect(() => {
    if (!scriptLoaded || !buttonRef.current || !window.google) return;
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) { setError('NEXT_PUBLIC_GOOGLE_CLIENT_ID 미설정'); return; }

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
        type: 'standard', theme: 'outline', size: 'large',
        text: 'continue_with', shape: 'pill', locale: 'ko', width: 260,
      });

      window.google!.accounts.id.prompt();
    })();
  }, [scriptLoaded, generateNonce, handleCredential]);

  return (
    <div className="rounded-2xl border border-brand-100 bg-white p-8 shadow-sm text-center space-y-5">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptLoaded(true)}
        onError={() => setError('Google 스크립트 로드 실패')}
      />
      <div className="space-y-1.5">
        <p className="text-base font-bold text-slate-800">이야기를 시작하려면</p>
        <p className="text-sm text-slate-400">
          로그인하면 어떤 기기에서도<br />오늘의 한 편을 이어갈 수 있어요
        </p>
      </div>
      <div className="flex justify-center min-h-[44px]">
        <div ref={buttonRef} />
      </div>
      {error && <p className="text-xs text-rose-500">{error}</p>}
    </div>
  );
}
