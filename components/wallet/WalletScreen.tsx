'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CreditCard, Sparkles } from 'lucide-react';
import { centsToEuros, eurosToCents } from '@/lib/format';
import { demoTopup, fetchWallet, fetchWalletTransactions, isDbReady } from '@/lib/db';
import type { WalletTransaction } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import GhostLogo from '@/components/brand/GhostLogo';

type AppConfig = {
  stripe: boolean;
  demoWallet: boolean;
  stripeMissing?: string[];
};

async function fetchAppConfig(): Promise<AppConfig> {
  const res = await fetch('/api/config', { cache: 'no-store' });
  if (res.ok) return res.json();

  const legacy = await fetch('/api/stripe/status', { cache: 'no-store' });
  if (legacy.ok) {
    const d = await legacy.json();
    return { stripe: !!d.enabled, demoWallet: false };
  }

  return { stripe: false, demoWallet: false };
}

const MIN_TOPUP_EUR = 0.5;
const MAX_TOPUP_EUR = 500;
const TOPUP_SHORTCUTS = ['20', '50', '100'] as const;

function formatTopupEuros(euros: number): string {
  return euros % 1 === 0 ? euros.toFixed(0) : euros.toFixed(2);
}

export default function WalletScreen({
  userId,
  onBack,
  onBalanceChange,
}: {
  userId: string;
  onBack?: () => void;
  onBalanceChange?: () => void;
}) {
  const [balanceCents, setBalanceCents] = useState(0);
  const [pendingCents, setPendingCents] = useState(0);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [topupEuros, setTopupEuros] = useState(50);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [dbReady, setDbReady] = useState(true);
  const [busy, setBusy] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const paymentHandled = useRef(false);

  const stripeEnabled = !!config?.stripe;
  const demoEnabled = !!config?.demoWallet;
  const configLoading = config === null;

  const load = useCallback(async (opts?: { initial?: boolean }) => {
    const isInitial = opts?.initial ?? false;
    if (isInitial) setInitialLoading(true);
    else setRefreshing(true);

    try {
      setDbReady(await isDbReady());
      const w = await fetchWallet(userId);
      setBalanceCents(w?.balance_cents ?? 0);
      setPendingCents(w?.pending_cents ?? 0);
      return w;
    } finally {
      if (isInitial) setInitialLoading(false);
      else setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { load({ initial: true }); }, [load]);

  useEffect(() => {
    fetchWalletTransactions(userId).then(setTransactions).catch(() => setTransactions([]));
  }, [userId, balanceCents]);

  useEffect(() => {
    fetchAppConfig()
      .then(setConfig)
      .catch(() => setConfig({ stripe: false, demoWallet: false }));
  }, []);

  useEffect(() => {
    if (paymentHandled.current) return;
    const params = new URLSearchParams(window.location.search);
    const walletStatus = params.get('wallet');
    if (!walletStatus) return;

    paymentHandled.current = true;
    window.history.replaceState({}, '', window.location.pathname);

    if (walletStatus === 'cancel') {
      setError('Paiement annulé');
      return;
    }

    if (walletStatus !== 'success') return;

    const sessionId = params.get('session_id');
    setMsg('Paiement reçu ! Mise à jour du solde…');

    (async () => {
      const before = (await fetchWallet(userId))?.balance_cents ?? 0;

      if (sessionId) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          const res = await fetch('/api/stripe/confirm', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
              'Content-Type': 'application/json',
              ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
            },
            body: JSON.stringify({ session_id: sessionId }),
          });
          const data = await res.json();
          if (res.ok) {
            setMsg(data.credited
              ? `+${centsToEuros(data.amount_cents)} € ajoutés ✨`
              : 'Solde déjà à jour ✨');
            await load();
            onBalanceChange?.();
            return;
          }
          if (data.error) setError(data.error);
        } catch {
          /* retry polling */
        }
      }

      for (let i = 0; i < 8; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const w = await load();
        if ((w?.balance_cents ?? 0) > before) {
          setMsg('Solde mis à jour ✨');
          onBalanceChange?.();
          return;
        }
      }
      if (!sessionId) {
        setError('Paiement reçu mais solde pas encore crédité. Recharge la page dans 1 min.');
      }
    })();
  }, [userId, load, onBalanceChange]);

  const recharge = async (mode: 'demo' | 'stripe') => {
    const cents = eurosToCents(topupEuros);
    if (Number.isNaN(cents) || cents < 50) {
      setError('Minimum 0,50 €');
      return;
    }
    if (cents > 50000) {
      setError('Maximum 500 €');
      return;
    }
    setBusy(true);
    setError(null);
    setMsg(null);
    const prevBalance = balanceCents;

    try {
      if (mode === 'demo') {
        await demoTopup(cents, userId);
        const w = await load();
        const newBalance = w?.balance_cents ?? 0;
        if (newBalance <= prevBalance) {
          throw new Error('Recharge démo refusée (désactivée en production).');
        }
        setMsg(`+${centsToEuros(cents)} € ajoutés ✨`);
        onBalanceChange?.();
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error('Session expirée — déconnecte-toi puis reconnecte-toi.');
      }

      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ amount_cents: cents }),
      });

      let data: { url?: string; error?: string; hint?: string } = {};
      try {
        data = await res.json();
      } catch {
        throw new Error(`Erreur serveur (${res.status})`);
      }

      if (!res.ok) {
        throw new Error([data.error, data.hint].filter(Boolean).join(' — '));
      }

      if (!data.url) {
        throw new Error('Pas d’URL Stripe reçue. Vérifie la config Vercel.');
      }

      window.location.assign(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally {
      setBusy(false);
    }
  };

  const canRecharge = stripeEnabled || demoEnabled;
  const displayBalance = initialLoading ? '...' : centsToEuros(balanceCents);

  return (
    <div className="animate-slide-up px-4 py-4">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-text-2 text-sm font-semibold mb-4 -ml-1 py-1"
        >
          <ArrowLeft className="w-4 h-4" /> Retour
        </button>
      )}

      <div className={`ui-card p-6 text-center mb-4 transition-opacity ${refreshing ? 'opacity-70' : ''}`}>
        <div className="ghost-logo-wrap w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-ghost-float">
          <GhostLogo size={44} />
        </div>
        <p className="text-text-3 text-xs uppercase font-bold tracking-wider">Portefeuille</p>
        <p
          className="text-4xl font-extrabold text-text mt-2 tabular-nums min-h-[2.75rem] flex items-center justify-center"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {displayBalance} €
        </p>
        {pendingCents > 0 && (
          <p className="text-amber-600 text-sm mt-2">{centsToEuros(pendingCents)} € en attente</p>
        )}
      </div>

      {!dbReady && (
        <div className="ui-card p-4 mb-4 border-amber-500/30 bg-amber-500/10">
          <p className="text-amber-200 text-sm font-semibold">Base de données à configurer</p>
          <p className="text-amber-200/70 text-xs mt-1">Exécute les migrations SQL dans Supabase.</p>
        </div>
      )}

      <div className="ui-card p-5 mb-3">
        <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-buyer" /> Recharger
        </h2>

        {configLoading && (
          <p className="text-text-3 text-sm mb-4">Vérification du paiement…</p>
        )}

        {!configLoading && !canRecharge && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 text-sm text-amber-100 space-y-2">
            <p className="font-semibold">Paiement indisponible</p>
            <p>Stripe n’est pas configuré sur Vercel.</p>
            {config?.stripeMissing?.length ? (
              <p className="text-xs font-mono bg-amber-500/15 rounded-lg px-2 py-1.5">
                Manquant : {config.stripeMissing.join(', ')}
              </p>
            ) : null}
            <p className="text-xs">Ajoute les clés Stripe dans Vercel → Settings → Environment Variables, puis redeploy.</p>
          </div>
        )}

        {canRecharge && (
          <>
            <div className="flex gap-2 mb-4">
              {TOPUP_SHORTCUTS.map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setTopupEuros(parseFloat(v))}
                  disabled={busy}
                  className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                    topupEuros === parseFloat(v) ? 'border-buyer bg-buyer/15 text-buyer' : 'border-border text-text-2'
                  }`}
                >
                  {v} €
                </button>
              ))}
            </div>

            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-text-3 text-xs font-semibold">Montant</p>
                <p
                  className="text-2xl font-extrabold text-text tabular-nums"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {formatTopupEuros(topupEuros)} €
                </p>
              </div>
              <input
                type="range"
                min={MIN_TOPUP_EUR}
                max={MAX_TOPUP_EUR}
                step="0.5"
                value={topupEuros}
                onChange={(e) => setTopupEuros(parseFloat(e.target.value))}
                disabled={busy}
                className="w-full h-2 rounded-full appearance-none bg-white/10 accent-accent cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-text-3 mt-1">
                <span>0,50 €</span>
                <span>100 €</span>
                <span>250 €</span>
                <span>500 €</span>
              </div>
            </div>
          </>
        )}

        {stripeEnabled && (
          <button
            type="button"
            onClick={() => recharge('stripe')}
            disabled={busy || configLoading}
            className="btn-buyer w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-2 disabled:opacity-60"
          >
            <CreditCard className="w-4 h-4" />
            {busy ? 'Redirection vers Stripe…' : 'Payer par carte'}
          </button>
        )}

        {demoEnabled && (
          <button
            type="button"
            onClick={() => recharge('demo')}
            disabled={busy || configLoading}
            className={`w-full py-3.5 text-sm rounded-xl font-bold border disabled:opacity-60 ${
              stripeEnabled
                ? 'border-border text-text-2 hover:bg-card-muted'
                : 'btn-buyer'
            }`}
          >
            {busy ? 'Recharge…' : stripeEnabled ? 'Recharger (démo test)' : 'Recharger'}
          </button>
        )}
      </div>

      {transactions.length > 0 && (
        <div className="ui-card p-4 mb-3">
          <h2 className="font-bold text-sm mb-3">Historique</h2>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex justify-between items-start gap-2 text-sm py-1.5 border-b border-white/5 last:border-0">
                <div className="min-w-0">
                  <p className="font-semibold text-text truncate">{tx.description ?? tx.type}</p>
                  <p className="text-[10px] text-text-3">
                    {formatDistanceToNow(new Date(tx.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <p className={`font-bold tabular-nums shrink-0 ${tx.amount_cents >= 0 ? 'text-seller' : 'text-rose'}`}>
                  {tx.amount_cents >= 0 ? '+' : ''}{centsToEuros(tx.amount_cents)} €
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="min-h-[3rem] flex flex-col items-center justify-center gap-1 px-2">
        {msg && <p className="text-center text-sm text-seller font-semibold">{msg}</p>}
        {error && (
          <p className="text-center text-sm text-rose font-semibold bg-rose/10 border border-rose/25 rounded-xl px-3 py-2 w-full">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}