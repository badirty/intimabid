'use client';

import { LogOut, ShoppingBag, Store, ArrowLeftRight } from 'lucide-react';
import type { AppMode, PreferredMode } from '@/lib/types';
import { supabase } from '@/lib/supabase';

export default function ProfileScreen({
  email,
  appMode,
  preferredMode,
  onSignOut,
  onModeChange,
  onPreferredModeChange,
}: {
  email?: string;
  appMode: AppMode;
  preferredMode: PreferredMode;
  onSignOut: () => void;
  onModeChange: (m: AppMode) => void;
  onPreferredModeChange?: (m: PreferredMode) => void;
}) {
  const name = email?.split('@')[0] ?? 'user';

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
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-buyer to-buyer-light flex items-center justify-center text-2xl font-extrabold text-white mx-auto mb-4">
          {name[0]?.toUpperCase()}
        </div>
        <h2 className="font-extrabold text-xl" style={{ fontFamily: 'var(--font-display)' }}>@{name}</h2>
        <p className="text-text-2 text-sm mt-1">{email}</p>
        <p className="text-text-3 text-xs mt-2">Acheteur &amp; Vendeur</p>
      </div>

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
          { v: 8, l: 'Enchéries' },
          { v: 12, l: 'Ventes' },
          { v: '145€', l: 'Solde' },
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