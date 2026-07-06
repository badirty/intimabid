'use client';

import { useState } from 'react';
import { centsToEuros } from '@/lib/format';

export default function BidModal({
  title,
  minCents,
  onClose,
  onSubmit,
}: {
  title: string;
  minCents: number;
  onClose: () => void;
  onSubmit: (amountCents: number) => Promise<void>;
}) {
  const [euros, setEuros] = useState((minCents / 100).toFixed(2));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const cents = Math.round(parseFloat(euros) * 100);
    if (Number.isNaN(cents) || cents < minCents) {
      setError(`Minimum : ${centsToEuros(minCents)} €`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSubmit(cents);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4" onClick={onClose}>
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
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-xl border border-border text-sm font-semibold">Annuler</button>
          <button onClick={submit} disabled={loading} className="btn-buyer flex-1 py-3 text-sm">
            {loading ? '...' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  );
}