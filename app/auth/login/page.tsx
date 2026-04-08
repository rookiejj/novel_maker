'use client';

import { useRef, useCallback } from 'react';
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

export default function LoginPage() {
  const router = useRouter();
  const buttonRef = useRef<HTMLDivElement>(null);
  const rawNonceRef = useRef<string | null>(null);

  // nonce: raw를 supabase에, SHA-256 hashed를 google에 전달
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
        alert(`로그인 실패: ${error.message}`);
        return;
      }
      router.push('/');
      router.refresh();
    } catch (err) {
      console.error('[GSI callback]', err);
    }
  }, [router]);

  const initializeGsi = useCallback(async () => {
    if (!window.google || !buttonRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      console.error('NEXT_PUBLIC_GOOGLE_CLIENT_ID 환경변수가 설정되지 않았습니다.');
      return;
    }

    const { raw, hashed } = await generateNonce();
    rawNonceRef.current = raw;

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleCredential,
      nonce: hashed,
      use_fedcm_for_prompt: true,
      auto_select: false,
    });

    window.google.accounts.id.renderButton(buttonRef.current, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      text: 'continue_with',
      shape: 'pill',
      logo_alignment: 'left',
      locale: 'ko',
    });

    // One Tap 프롬프트 (옵션)
    window.google.accounts.id.prompt();
  }, [generateNonce, handleCredential]);

  return (
    <div className="min-h-screen bg-[#F0EEFF] flex flex-col items-center justify-center px-4">
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => { initializeGsi(); }}
      />
      <div className="w-full max-w-sm space-y-8 text-center">
        <div>
          <h1 className="text-2xl font-bold text-brand-700">한편</h1>
          <p className="mt-2 text-sm text-slate-500">
            아무도 읽지 않는 이야기를 씁니다
          </p>
        </div>

        <div className="flex justify-center">
          <div ref={buttonRef} />
        </div>

        <p className="text-xs text-slate-400">
          로그인하면 어떤 기기에서도 이야기를 이어갈 수 있습니다
        </p>
      </div>
    </div>
  );
}