'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finish = async () => {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('error_description') ?? params.get('error');
      if (err) {
        if (!cancelled) setError(decodeURIComponent(err.replace(/\+/g, ' ')));
        return;
      }

      const code = params.get('code');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) {
          if (!cancelled) setError(exchangeError.message);
          return;
        }
        router.replace('/');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        router.replace('/');
        return;
      }

      if (!cancelled) setError('Code manquant.');
    };

    finish();
    return () => { cancelled = true; };
  }, [router]);

  return (
    <div className="app-shell">
      <div
        className="flex flex-col items-center justify-center gap-4 p-6 flex-1 min-h-dvh"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {error ? (
          <div className="ui-card p-6 text-center max-w-sm">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <p className="text-text-3 text-xs mb-4">
              Vérifie que l&apos;URL de callback est bien autorisée dans Supabase (ex.{' '}
              <span className="font-mono text-[10px]">{typeof window !== 'undefined' ? `${window.location.origin}/auth/callback` : '/auth/callback'}</span>
              ).
            </p>
            <button onClick={() => router.replace('/')} className="btn-buyer px-6 py-2.5 text-sm rounded-xl">
              Retour
            </button>
          </div>
        ) : (
          <>
            <div className="w-10 h-10 rounded-xl bg-buyer flex items-center justify-center font-black text-white">B</div>
            <p className="text-text-2 text-sm">Connexion...</p>
          </>
        )}
      </div>
    </div>
  );
}