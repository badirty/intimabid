'use client';

import { useEffect, useState } from 'react';
import { LogOut, ShoppingBag, Store, ArrowLeftRight, Wallet } from 'lucide-react';
import type { AppMode, PreferredMode } from '@/lib/types';
import { supabase } from '@/lib/supabase';
import { centsToEuros } from '@/lib/format';
import { fetchUserStats } from '@/lib/db';
import GhostLogo from '@/components/brand/GhostLogo';

export default function ProfileScreen({
  userId,
  email,
  appMode,
  preferredMode,
  onSignOut,
  onModeChange,
  onPreferredModeChange,
  onWallet,
  walletVersion = 0,
}: {
  userId: string;
  email?: string;
  appMode: AppMode;
  preferredMode: PreferredMode;
  onSignOut: () => void;
  onModeChange: (m: AppMode) => void;
  onPreferredModeChange?: (m: PreferredMode) => void;
  onWallet?: () => void;
  walletVersion?: number;
}) {
  const name = email?.split('@')[0] ?? 'user';
  const [stats, setStats] = useState({ bids_count: 0, sales_count: 0, balance_cents: 0 });

  useEffect(() => {
    fetchUserStats(userId).then(setStats);
  }, [userId, walletVersion]);

  const switchPreferred = async (mode: PreferredMode) => {
    await supabase.auth.updateUser({
      data: { preferred_mode: mode, role: mode === 'seller' ? 'seller' : 'buyer' },
    });
    onPreferredModeChange?.(mode);
    onModeChange(mode === 'seller' ? 'seller' : 'buyer');
  };

  return (
    <div className="animate-slide-up px-4 py-6">
      <div className="ui-card p-6 text-center mb-4">
        <div className="ghost-logo-wrap w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <GhostLogo size={48} />
        </div>
        <h2 className="font-extrabold text-xl" style={{ fontFamily: 'var(--font-display)' }}>@{name}</h2>
        <p className="text-text-2 text-sm mt-1">{email}</p>
        <p className="text-text-3 text-xs mt-2">Acheteur &amp; Vendeur</p>
      </div>

      <button
        type="button"
        onClick={() => onWallet?.()}
        disabled={!onWallet}
        className="ui-card w-full p-4 mb-4 flex items-center gap-3 hover:ring-2 hover:ring-buyer/20 transition-all disabled:opacity-50"
      >
        <div className="w-10 h-10 rounded-xl bg-buyer/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-buyer" />
        </div>
        <div className="text-left flex-1">
          <p className="font-bold text-sm">Portefeuille</p>
          <p className="text-seller font-extrabold">{centsToEuros(stats.balance_cents)} €</p>
        </div>
        <span className="text-text-3">→</span>
      </button>

      <div className="ui-card p-4 mb-4">
        <p className="text-xs text-text-3 uppercase tracking-wider font-bold mb-3">Basculer d&apos;interface</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => onModeChange('buyer')}
            className={`py-3 rounded-xl text-sm font-bold flex flex-col items-center gap-1 transition-all ${
              appMode === 'buyer' ? 'bg-buyer text-white' : 'bg-card-muted text-text-2'
            }`}
          >
            <ShoppingBag className="w-5 h-5" />
            Acheteur
          </button>
          <button
            onClick={() => onModeChange('seller')}
            className={`py-3 rounded-xl text-sm font-bold flex flex-col items-center gap-1 transition-all ${
              appMode === 'seller' ? 'bg-seller text-white' : 'bg-card-muted text-text-2'
            }`}
          >
            <Store className="w-5 h-5" />
            Vendeur
          </button>
        </div>
      </div>

      <div className="ui-card p-4 mb-4">
        <p className="text-xs text-text-3 uppercase tracking-wider font-bold mb-3 flex items-center gap-1">
          <ArrowLeftRight className="w-3.5 h-3.5" /> Accueil par défaut
        </p>
        <div className="flex gap-2">
          {(['buyer', 'seller', 'both'] as PreferredMode[]).map((m) => (
            <button
              key={m}
              onClick={() => switchPreferred(m)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize ${
                preferredMode === m ? 'bg-header text-white' : 'bg-card-muted text-text-2'
              }`}
            >
              {m === 'both' ? 'Les deux' : m === 'buyer' ? 'Achat' : 'Vente'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { v: stats.bids_count, l: 'Enchères' },
          { v: stats.sales_count, l: 'Ventes' },
          { v: `${centsToEuros(stats.balance_cents)}€`, l: 'Solde' },
        ].map((s) => (
          <div key={s.l} className="ui-card p-3 text-center">
            <p className="font-extrabold text-lg">{s.v}</p>
            <p className="text-[10px] text-text-3">{s.l}</p>
          </div>
        ))}
      </div>

      <button
        onClick={onSignOut}
        className="w-full py-3 rounded-xl border border-red-200 text-red-500 font-semibold text-sm flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" /> Déconnexion
      </button>
    </div>
  );
}