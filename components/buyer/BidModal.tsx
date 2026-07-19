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
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="ui-card-raised w-full max-w-[430px] p-6 animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-bold text-lg mb-1" style={{ fontFamily: 'var(--font-display)' }}>Offre personnalisée</h3>
        <p className="text-text-2 text-sm mb-5 truncate">{title}</p>
        <label className="form-label">Montant</label>
        <div className="relative mb-1">
          <input
            type="number"
            step="0.01"
            min={minCents / 100}
            value={euros}
            onChange={(e) => setEuros(e.target.value)}
            className="search-bar w-full px-4 py-3.5 text-sm outline-none pr-10"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">€</span>
        </div>
        <p className="text-text-3 text-xs mb-5 font-medium">Minimum : <span className="text-text-2">{centsToEuros(minCents)} €</span></p>
        {error && <p className="alert-error mb-4">{error}</p>}
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
        <div className="flex gap-3">
          <button onClick={onClose} className="btn-soft flex-1 py-3.5 text-sm">
            Annuler
          </button>
          <button onClick={submit} disabled={loading} className="btn-buyer flex-[1.5] py-3.5 text-sm">
            {loading ? '...' : 'Confirmer l\'offre'}
          </button>
        </div>
      </div>
    </div>
  );
}