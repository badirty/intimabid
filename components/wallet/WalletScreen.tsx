'use client';

import { useCallback, useEffect, useState } from 'react';
import { CreditCard, Wallet } from 'lucide-react';
import { centsToEuros, eurosToCents } from '@/lib/format';
import { demoTopup, fetchWallet } from '@/lib/db';
import { supabase } from '@/lib/supabase';

export default function WalletScreen({ userId }: { userId: string }) {
  const [balanceCents, setBalanceCents] = useState(0);
  const [pendingCents, setPendingCents] = useState(0);
  const [loading, setLoading] = useState(true);
  const [topupAmount, setTopupAmount] = useState('50');
  const [msg, setMsg] = useState<string | null>(null);
  const [stripeEnabled, setStripeEnabled] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const w = await fetchWallet(userId);
    setBalanceCents(w?.balance_cents ?? 0);
    setPendingCents(w?.pending_cents ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch('/api/stripe/status').then((r) => r.json()).then((d) => setStripeEnabled(!!d.enabled)).catch(() => {});
  }, []);

  const demoRecharge = async () => {
    const cents = eurosToCents(parseFloat(topupAmount));
    if (Number.isNaN(cents) || cents < 100) { setMsg('Minimum 1 €'); return; }
    try {
      await demoTopup(cents);
      setMsg(`+${centsToEuros(cents)} € ajoutés (démo)`);
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const stripeCheckout = async () => {
    const cents = eurosToCents(parseFloat(topupAmount));
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const res = await fetch('/api/stripe/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ amount_cents: cents }),
    });
    const data = await res.json();
    if (data.url) window.location.href = data.url;
    else setMsg(data.error ?? 'Stripe non configuré');
  };

  return (
    <div className="animate-slide-up px-4 py-6">
      <div className="ui-card p-6 text-center mb-4">
        <Wallet className="w-10 h-10 text-buyer mx-auto mb-3" />
        <p className="text-text-3 text-xs uppercase font-bold">Solde disponible</p>
        <p className="text-4xl font-extrabold text-text mt-2" style={{ fontFamily: 'var(--font-display)' }}>
          {loading ? '...' : centsToEuros(balanceCents)} €
        </p>
        {pendingCents > 0 && (
          <p className="text-amber-600 text-sm mt-2">{centsToEuros(pendingCents)} € en attente de retrait</p>
        )}
      </div>

      <div className="ui-card p-5 mb-4">
        <h2 className="font-bold text-sm mb-3">Recharger</h2>
        <div className="flex gap-2 mb-4">
          {['20', '50', '100'].map((v) => (
            <button
              key={v}
              onClick={() => setTopupAmount(v)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border ${
                topupAmount === v ? 'border-buyer bg-buyer/10 text-buyer' : 'border-border text-text-2'
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

        {stripeEnabled ? (
          <button onClick={stripeCheckout} className="btn-buyer w-full py-3.5 text-sm flex items-center justify-center gap-2">
            <CreditCard className="w-4 h-4" /> Payer par carte (Stripe)
          </button>
        ) : (
          <button onClick={demoRecharge} className="btn-buyer w-full py-3.5 text-sm">
            Recharger (mode démo)
          </button>
        )}

        {!stripeEnabled && (
          <p className="text-text-3 text-[11px] text-center mt-3">
            Stripe pas encore configuré. Recharge démo active pour tester les enchères.
            Ajoute <code className="text-[10px]">STRIPE_SECRET_KEY</code> sur Vercel pour activer les paiements réels.
          </p>
        )}
      </div>

      {msg && <p className="text-center text-sm text-text-2">{msg}</p>}
    </div>
  );
}