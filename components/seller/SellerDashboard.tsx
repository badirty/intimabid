'use client';

import { useState } from 'react';
import { Shirt } from 'lucide-react';
import { ACTIVE_SALES } from '@/lib/data';

const DURATIONS = ['3j', '5j', '7j'] as const;

export default function SellerDashboard() {
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>('5j');
  const [startPrice, setStartPrice] = useState(25);
  const balance = 145;

  return (
    <div className="animate-slide-up">
      <div className="header-dark px-5 py-4">
        <h1 className="text-2xl font-extrabold tracking-wide text-center" style={{ fontFamily: 'var(--font-display)' }}>
          VENDEUR
        </h1>
        <p className="text-center text-white/50 text-sm mt-1">Dashboard</p>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Balance */}
        <div className="ui-card px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-text-3 text-xs uppercase tracking-wider font-semibold">Solde disponible</p>
            <p className="text-3xl font-extrabold text-seller mt-1" style={{ fontFamily: 'var(--font-display)' }}>
              {balance.toFixed(2)} €
            </p>
          </div>
          <button className="btn-seller px-4 py-2 text-sm rounded-full">
            Retirer
          </button>
        </div>

        {/* Create auction */}
        <div className="ui-card p-5">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-text-2 mb-4">
            Créer une enchère
          </h2>

          <button className="w-full border-2 border-dashed border-border rounded-xl py-8 flex flex-col items-center gap-2 hover:border-seller/50 transition-colors mb-4">
            <div className="relative">
              <Shirt className="w-10 h-10 text-text-3" />
              <span className="absolute -top-1 -right-2 w-5 h-5 bg-seller text-white rounded-full text-xs font-bold flex items-center justify-center">+</span>
            </div>
            <span className="text-sm font-semibold text-text-2">Ajouter photos / vidéos</span>
          </button>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-2">Prix de départ</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setStartPrice((p) => Math.max(10, p - 5))}
                  className="w-8 h-8 rounded-lg border border-border font-bold text-text-2">−</button>
                <span className="font-extrabold text-lg w-12 text-center">{startPrice} €</span>
                <button onClick={() => setStartPrice((p) => p + 5)}
                  className="w-8 h-8 rounded-lg border border-border font-bold text-text-2">+</button>
              </div>
            </div>

            <div>
              <p className="text-sm text-text-2 mb-2">Durée</p>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`duration-pill ${duration === d ? 'active' : ''}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button className="btn-seller w-full py-4 text-sm mt-5 uppercase tracking-wide">
            Lancer l&apos;enchère
          </button>
        </div>

        {/* Active sales */}
        <div className="ui-card p-5">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-text-2 mb-4">
            Mes ventes en cours
          </h2>
          <div className="space-y-3">
            {ACTIVE_SALES.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="font-semibold text-sm text-text">{sale.title}</p>
                  <p className="text-xs text-text-3">{sale.offers} offres</p>
                </div>
                <button className={`text-sm font-bold px-4 py-2 rounded-full ${
                  sale.action === 'Booster'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-blue-50 text-buyer'
                }`}>
                  {sale.action}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}