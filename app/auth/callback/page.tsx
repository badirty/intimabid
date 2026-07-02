'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import PhoneWrapper from '@/components/layout/PhoneWrapper';

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error_description') ?? params.get('error');
    if (err) { setError(decodeURIComponent(err.replace(/\+/g, ' '))); return; }

    const code = params.get('code');
    if (!code) { setError('Code manquant.'); return; }

    let done = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((e, s) => {
      if (!done && s && (e === 'SIGNED_IN' || e === 'INITIAL_SESSION')) { done = true; router.replace('/'); }
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!done && session) { done = true; router.replace('/'); }
    });
    const t = setTimeout(() => { if (!done) setError('Connexion expirée.'); }, 10000);
    return () => { subscription.unsubscribe(); clearTimeout(t); };
  }, [router]);

  return (
    <PhoneWrapper>
    <div className="flex flex-col items-center justify-center gap-4 p-6 min-h-[80dvh]">
      {error ? (
        <div className="ui-card p-6 text-center">
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button onClick={() => router.replace('/')} className="btn-buyer px-6 py-2.5 text-sm rounded-xl">Retour</button>
        </div>
      ) : (
        <>
          <div className="w-10 h-10 rounded-xl bg-buyer flex items-center justify-center font-black text-white">B</div>
          <p className="text-text-2 text-sm">Connexion...</p>
        </>
      )}
    </div>
    </PhoneWrapper>
  );
}