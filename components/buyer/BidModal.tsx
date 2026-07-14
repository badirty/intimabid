'use client';

import { useState } from 'react';
import { Wallet } from 'lucide-react';
import { centsToEuros } from '@/lib/format';

export default function BidModal({
  title,
  minCents,
  onClose,
  onSubmit,
  onWalletNeeded,
}: {
  title: string;
  minCents: number;
  onClose: () => void;
  onSubmit: (amountCents: number) => Promise<void>;
  onWalletNeeded?: () => void;
}) {
  const [euros, setEuros] = useState((minCents / 100).toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsWallet, setNeedsWallet] = useState(false);

  const submit = async () => {
    const cents = Math.round(parseFloat(euros) * 100);
    if (Number.isNaN(cents) || cents < minCents) {
      setError(`Minimum : ${centsToEuros(minCents)} €`);
      setNeedsWallet(false);
      return;
    }
    setLoading(true);
    setError(null);
    setNeedsWallet(false);
    try {
      await onSubmit(cents);
      onClose();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      setError(msg);
      if (msg.includes('Solde')) setNeedsWallet(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="ui-card w-full max-w-[430px] p-5 animate-slide-up" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-1">Offre personnalisée</h3>
        <p className="text-text-2 text-sm mb-4 truncate">{title}</p>
        <label className="text-xs text-text-3 font-semibold">Montant (€)</label>
        <input
          type="number"
          step="0.01"
          min={minCents / 100}
          value={euros}
          onChange={(e) => setEuros(e.target.value)}
          className="search-bar w-full px-4 py-3 text-sm mt-1 mb-3 outline-none"
        />
        <p className="text-text-3 text-xs mb-4">Minimum : {centsToEuros(minCents)} €</p>
        {error && <p className="alert-error mb-3">{error}</p>}
        {needsWallet && onWalletNeeded && (
          <button
            type="button"
            onClick={() => { onClose(); onWalletNeeded(); }}
            className="btn-accent w-full py-3 text-sm mb-3 flex items-center justify-center gap-2"
          >
            <Wallet className="w-4 h-4" />
            Recharger le portefeuille
          </button>
        )}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold text-text-2">
            Annuler
          </button>
          <button onClick={submit} disabled={loading} className="btn-buyer flex-1 py-3 text-sm">
            {loading ? '...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}