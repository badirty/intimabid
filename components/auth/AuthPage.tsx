'use client';

import { useState, useEffect } from 'react';
import type { Provider } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { getAuthRedirectUrl } from '@/lib/auth-redirect';
import { GoogleIcon, XIcon } from '@/components/icons';
import GhostLogo from '@/components/brand/GhostLogo';
type AuthView = 'login' | 'signup';

export default function AuthPage({
  onAuthSuccess,
  onBack,
  initialView = 'login',
}: {
  onAuthSuccess?: () => void;
  onBack?: () => void;
  initialView?: AuthView;
}) {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const oauthError = params.get('error_description') ?? params.get('error');
    if (oauthError) {
      setError(decodeURIComponent(oauthError.replace(/\+/g, ' ')));
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

  const signInWithProvider = async (provider: Provider) => {
    setLoading(provider);
    setError(null);
    const redirectTo = getAuthRedirectUrl();
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo },
    });
    if (e) { setError(e.message); setLoading(null); }
  };

  const handleEmailAuth = async () => {
    if (!email || !password) { setError('E-mail et mot de passe requis.'); return; }
    setLoading('email');
    setError(null);
    if (view === 'login') {
      const { error: e } = await supabase.auth.signInWithPassword({ email, password });
      if (e) setError(e.message); else onAuthSuccess?.();
    } else {
      const { error: e } = await supabase.auth.signUp({ email, password, options: { emailRedirectTo: getAuthRedirectUrl() } });
      if (e) setError(e.message); else alert('Compte créé ! Vérifie ton e-mail.');
    }
    setLoading(null);
  };

  return (
    <div className="app-shell">
    <div
      className="flex items-center justify-center p-6 flex-1 min-h-dvh"
      style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="w-full max-w-sm animate-slide-up">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-text-3 mb-4 text-sm font-semibold hover:text-text-2 transition-colors"
          >
            ← Retour
          </button>
        )}
        <div className="text-center mb-8">
          <div className="ghost-logo-wrap w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-ghost-float">
            <GhostLogo size={52} />
          </div>
          <h1 className="text-3xl font-extrabold text-text" style={{ fontFamily: 'var(--font-display)' }}>badirty</h1>
          <p className="text-text-2 text-sm mt-2">Enchères privées · vibe ghost</p>
        </div>

        <div className="ui-card p-6">
          <h2 className="font-bold text-lg mb-1">{view === 'login' ? 'Connexion' : 'Inscription'}</h2>
          <p className="text-text-2 text-xs mb-5">Acheteur ou vendeur — un seul compte</p>

          <div className="space-y-2">
            <button onClick={() => signInWithProvider('google')} disabled={!!loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-card-muted transition-colors disabled:opacity-50">
              <GoogleIcon /> Google
            </button>
            <button onClick={() => signInWithProvider('x')} disabled={!!loading}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-border font-semibold text-sm hover:bg-card-muted transition-colors disabled:opacity-50">
              <XIcon /> X
            </button>
          </div>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-3 text-xs">ou</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <div className="space-y-3">
            <input type="email" placeholder="E-mail" value={email} onChange={(e) => setEmail(e.target.value)}
              className="search-bar w-full px-4 py-3 text-sm outline-none" />
            <input type="password" placeholder="Mot de passe" value={password}
              onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleEmailAuth()}
              className="search-bar w-full px-4 py-3 text-sm outline-none" />
            {error && <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <button onClick={handleEmailAuth} disabled={!!loading}
              className="btn-buyer w-full py-3.5 text-sm">
              {loading === 'email' ? '...' : view === 'login' ? 'Se connecter' : 'Créer un compte'}
            </button>
          </div>

          <button onClick={() => { setView(view === 'login' ? 'signup' : 'login'); setError(null); }}
            className="w-full mt-4 text-sm text-buyer font-semibold">
            {view === 'login' ? "Pas de compte ? S'inscrire" : 'Déjà membre ?'}
          </button>
        </div>
      </div>
    </div>
    </div>
  );
}