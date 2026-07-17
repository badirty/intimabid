'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, CreditCard, Sparkles } from 'lucide-react';
import { centsToEuros, eurosToCents } from '@/lib/format';
import {
  cancelPendingWithdrawal,
  fetchWallet,
  fetchWalletTransactions,
  isDbReady,
  withdrawToBank,
} from '@/lib/db';
import type { WalletTransaction } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import GhostLogo from '@/components/brand/GhostLogo';
import ConnectOnboarding from '@/components/wallet/ConnectOnboarding';

type AppConfig = {
  stripe: boolean;
  stripeMissing?: string[];
};

async function fetchAppConfig(): Promise<AppConfig> {
  const res = await fetch('/api/config', { cache: 'no-store' });
  if (res.ok) return res.json();

  const legacy = await fetch('/api/stripe/status', { cache: 'no-store' });
  if (legacy.ok) {
    const d = await legacy.json();
    return { stripe: !!d.enabled };
  }

  return { stripe: false };
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
  const [withdrawEuros, setWithdrawEuros] = useState(10);
  type ConnectStatus = {
    linked: boolean;
    ready: boolean;
    payouts_enabled: boolean;
    currently_due_labels: string[];
    pending_verification: string[];
  };

  const [connectStatus, setConnectStatus] = useState<ConnectStatus | null>(null);
  const [showConnectOnboarding, setShowConnectOnboarding] = useState(false);
  const paymentHandled = useRef(false);

  const connectReady = !!connectStatus?.ready;
  const connectLinked = !!connectStatus?.linked;
  const connectDue = connectStatus?.currently_due_labels ?? [];

  const refreshConnectStatus = useCallback(() => {
    fetch('/api/stripe/connect/status', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        setConnectStatus({
          linked: !!(d.linked || d.payouts_enabled || d.has_external_account),
          ready: !!(d.ready || d.payouts_enabled),
          payouts_enabled: !!d.payouts_enabled,
          currently_due_labels: Array.isArray(d.currently_due_labels) ? d.currently_due_labels : [],
          pending_verification: Array.isArray(d.pending_verification) ? d.pending_verification : [],
        });
      })
      .catch(() =>
        setConnectStatus({
          linked: false,
          ready: false,
          payouts_enabled: false,
          currently_due_labels: [],
          pending_verification: [],
        }),
      );
  }, []);

  const stripeEnabled = !!config?.stripe;
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
      .catch(() => setConfig({ stripe: false }));
  }, []);

  useEffect(() => {
    if (!stripeEnabled) return;
    refreshConnectStatus();
  }, [stripeEnabled, refreshConnectStatus]);

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

    if (walletStatus === 'connect_done' || walletStatus === 'connect_refresh') {
      setMsg('Compte bancaire mis à jour');
      refreshConnectStatus();
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
  }, [userId, load, onBalanceChange, refreshConnectStatus]);

  const recharge = async () => {
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

    try {
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

  const canRecharge = stripeEnabled;
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
          <div className="mt-3 space-y-2">
            <p className="text-amber-400 text-sm">{centsToEuros(pendingCents)} € en cours de virement</p>
            <button
              type="button"
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                setError(null);
                try {
                  const cancelled = await cancelPendingWithdrawal();
                  if (cancelled > 0) {
                    setMsg('Retrait annulé — montant recrédité sur ton portefeuille');
                  }
                  await load();
                  onBalanceChange?.();
                } catch (e) {
                  setError(e instanceof Error ? e.message : 'Erreur');
                } finally {
                  setBusy(false);
                }
              }}
              className="text-xs text-rose hover:underline disabled:opacity-50"
            >
              Annuler le retrait en attente
            </button>
          </div>
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
            onClick={() => recharge()}
            disabled={busy || configLoading}
            className="btn-buyer w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-2 disabled:opacity-60"
          >
            <CreditCard className="w-4 h-4" />
            {busy ? 'Redirection vers Stripe…' : 'Payer par carte'}
          </button>
        )}


      </div>

      <div className="ui-card p-5 mb-3">
        <h2 className="font-bold text-sm mb-3">Retirer vers mon compte</h2>
        <p className="text-text-3 text-xs mb-3">
          Virement vers ton RIB. Formulaire badirty uniquement — pas de parcours « société » Stripe.
          Délai habituel : 1–3 jours ouvrés.
        </p>
        {connectStatus === null && (
          <p className="text-text-3 text-xs mb-3">Vérification du compte bancaire…</p>
        )}
        {connectStatus && !connectLinked && (
          <p className="text-amber-200/90 text-xs mb-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">
            Une seule fois : identité + IBAN. Ensuite tu retires en 1 tap.
          </p>
        )}
        {connectStatus && connectLinked && !connectReady && (
          <div className="text-amber-200/90 text-xs mb-3 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2 space-y-1">
            <p className="font-semibold">✓ Infos enregistrées — validation Stripe en cours</p>
            <p>
              Ton RIB est bien lié. Les retraits s’activent quand Stripe valide le compte
              (parfois immédiat, parfois pièce d’identité requise).
            </p>
            {connectDue.length > 0 && (
              <p className="text-text-2">Encore requis : {connectDue.join(', ')}</p>
            )}
          </div>
        )}
        {connectReady && (
          <p className="text-seller text-xs mb-3">✓ Compte bancaire connecté — prêt à retirer</p>
        )}
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            min={1}
            max={500}
            step={0.5}
            value={withdrawEuros}
            onChange={(e) => setWithdrawEuros(parseFloat(e.target.value) || 0)}
            disabled={busy || pendingCents > 0}
            className="search-bar flex-1 px-3 py-2.5 text-sm disabled:opacity-50"
          />
          <span className="text-text-3 text-sm self-center">€</span>
        </div>
        <button
          type="button"
          disabled={busy || pendingCents > 0 || !connectReady}
          onClick={async () => {
            setBusy(true);
            setError(null);
            setMsg(null);
            try {
              const amount = Math.round(withdrawEuros * 100);
              if (amount < 100) throw new Error('Minimum 1 €');
              if (amount > balanceCents) throw new Error('Solde insuffisant');
              const data = await withdrawToBank(amount);
              setMsg(data.message ?? 'Virement envoyé');
              await load();
              onBalanceChange?.();
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Erreur');
            } finally {
              setBusy(false);
            }
          }}
          className="btn-ghost w-full py-2.5 text-xs mb-2 disabled:opacity-50"
        >
          {busy
            ? 'Virement en cours…'
            : connectLinked && !connectReady
              ? 'Retrait bientôt dispo (validation Stripe)'
              : 'Retirer vers mon compte'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setError(null);
            setShowConnectOnboarding(true);
          }}
          className="btn-accent w-full py-2.5 text-xs"
        >
          {connectReady
            ? 'Mettre à jour mon RIB'
            : connectLinked
              ? 'Mettre à jour mes infos / RIB'
              : 'Lier mon compte bancaire'}
        </button>
      </div>

      {showConnectOnboarding && (
        <ConnectOnboarding
          onClose={() => {
            setShowConnectOnboarding(false);
            refreshConnectStatus();
          }}
          onCompleted={() => {
            setMsg('Configuration bancaire enregistrée');
            // Petit délai : Stripe peut mettre à jour payouts_enabled en async
            refreshConnectStatus();
            setTimeout(refreshConnectStatus, 1500);
            setTimeout(refreshConnectStatus, 4000);
          }}
        />
      )}

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