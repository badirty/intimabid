'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Sparkles } from 'lucide-react';
import { centsToEuros, eurosToCents } from '@/lib/format';
import { demoTopup, fetchWallet, isDbReady } from '@/lib/db';
import { supabase } from '@/lib/supabase';
import GhostLogo from '@/components/brand/GhostLogo';

export default function WalletScreen({ userId }: { userId: string }) {
  const [balanceCents, setBalanceCents] = useState(0);
  const [pendingCents, setPendingCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState('50');
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);
  const [dbReady, setDbReady] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setDbReady(await isDbReady());
    const w = await fetchWallet(userId);
    setBalanceCents(w?.balance_cents ?? 0);
    setPendingCents(w?.pending_cents ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('wallet') === 'success') {
      setMsg('Paiement reçu ! Ton solde se met à jour…');
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(load, 2000);
    }
    if (params.get('wallet') === 'cancel') {
      setError('Paiement annulé');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [load]);

  useEffect(() => {
    fetch('/api/stripe/status').then((r) => r.json()).then((d) => setStripeEnabled(!!d.enabled)).catch(() => {});
  }, []);

  const recharge = async (mode: 'demo' | 'stripe') => {
    const cents = eurosToCents(parseFloat(topupAmount));
    if (Number.isNaN(cents) || cents < 100) { setError('Minimum 1 €'); return; }
    setBusy(true);
    setError(null);
    setMsg(null);
    try {
      if (mode === 'demo') {
        await demoTopup(cents, userId);
        setMsg(`+${centsToEuros(cents)} € ajoutés ✨`);
        await load();
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) throw new Error('Session expirée');
        const res = await fetch('/api/stripe/checkout', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ amount_cents: cents }),
        });
        const data = await res.json();
        if (data.url) window.location.href = data.url;
        else throw new Error(data.error ?? 'Erreur Stripe');
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="animate-slide-up px-4 py-6">
      <div className="ui-card p-6 text-center mb-4">
        <div className="ghost-logo-wrap w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3 animate-ghost-float">
          <GhostLogo size={44} />
        </div>
        <p className="text-text-3 text-xs uppercase font-bold tracking-wider">Portefeuille</p>
        <p className="text-4xl font-extrabold text-text mt-2" style={{ fontFamily: 'var(--font-display)' }}>
          {loading ? '...' : centsToEuros(balanceCents)} €
        </p>
        {pendingCents > 0 && (
          <p className="text-amber-600 text-sm mt-2">{centsToEuros(pendingCents)} € en attente</p>
        )}
      </div>

      {!dbReady && (
        <div className="ui-card p-4 mb-4 border-amber-200 bg-amber-50/80">
          <p className="text-amber-800 text-sm font-semibold">Base de données à configurer</p>
          <p className="text-amber-700 text-xs mt-1">
            Exécute le fichier <code className="text-[10px]">supabase/migrations/001_schema.sql</code> dans Supabase → SQL Editor.
          </p>
        </div>
      )}

      <div className="ui-card p-5 mb-4">
        <h2 className="font-bold text-sm mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-buyer" /> Recharger
        </h2>
        <div className="flex gap-2 mb-4">
          {['20', '50', '100'].map((v) => (
            <button
              key={v}
              onClick={() => setTopupAmount(v)}
              className={`flex-1 py-2 rounded-xl text-sm font-bold border transition-all ${
                topupAmount === v ? 'border-buyer bg-buyer/15 text-buyer' : 'border-border text-text-2'
              }`}
            >
              {v} €
            </button>
          ))}
        </div>
        <input
          type="number"
          value={topupAmount}
          onChange={(e) => setTopupAmount(e.target.value)}
          className="search-bar w-full px-4 py-3 text-sm mb-4 outline-none"
          placeholder="Montant en €"
        />

        {stripeEnabled && (
          <button
            onClick={() => recharge('stripe')}
            disabled={busy}
            className="btn-buyer w-full py-3.5 text-sm flex items-center justify-center gap-2 mb-2"
          >
            <CreditCard className="w-4 h-4" /> Payer par carte
          </button>
        )}

        <button
          onClick={() => recharge('demo')}
          disabled={busy}
          className={`w-full py-3.5 text-sm rounded-xl font-bold border ${
            stripeEnabled
              ? 'border-border text-text-2 hover:bg-card-muted'
              : 'btn-buyer'
          }`}
        >
          {busy ? '...' : stripeEnabled ? 'Recharger (démo test)' : 'Recharger'}
        </button>
      </div>

      {msg && <p className="text-center text-sm text-seller font-semibold">{msg}</p>}
      {error && <p className="text-center text-sm text-red-500">{error}</p>}
    </div>
  );
}