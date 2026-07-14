'use client';

import { useEffect, useState } from 'react';
import { LogOut, Wallet, Sparkles } from 'lucide-react';
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
  appMode?: string;
  preferredMode?: string;
  onSignOut: () => void;
  onModeChange?: (m: string) => void;
  onPreferredModeChange?: (m: string) => void;
  onWallet?: () => void;
  walletVersion?: number;
}) {
  const name = email?.split('@')[0] ?? 'user';
  const [stats, setStats] = useState({ bids_count: 0, sales_count: 0, balance_cents: 0 });

  useEffect(() => {
    fetchUserStats(userId).then(setStats);
  }, [userId, walletVersion]);

  return (
    <div className="animate-slide-up px-4 py-6">
      {/* Profile card */}
      <div className="ui-card p-6 text-center mb-4">
        <div className="ghost-logo-wrap w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <GhostLogo size={48} />
        </div>
        <h2 className="font-extrabold text-xl" style={{ fontFamily: 'var(--font-display)' }}>
          @{name}
        </h2>
        <p className="text-text-2 text-sm mt-1">{email}</p>
      </div>

      {/* Wallet button */}
      <button
        type="button"
        onClick={() => onWallet?.()}
        disabled={!onWallet}
        className="ui-card w-full p-4 mb-4 flex items-center gap-3 hover:border-accent/30 transition-all disabled:opacity-50"
      >
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
          <Wallet className="w-5 h-5 text-accent" />
        </div>
        <div className="text-left flex-1">
          <p className="font-bold text-sm">Portefeuille</p>
          <p className="text-accent font-extrabold">{centsToEuros(stats.balance_cents)} €</p>
        </div>
        <span className="text-text-3">→</span>
      </button>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {[
          { v: stats.bids_count, l: 'Enchères', color: 'text-accent' },
          { v: stats.sales_count, l: 'Ventes', color: 'text-pink' },
          { v: `${centsToEuros(stats.balance_cents)}€`, l: 'Solde', color: 'text-text' },
        ].map((s) => (
          <div key={s.l} className="ui-card p-3 text-center">
            <p className={`font-extrabold text-lg ${s.color}`}>{s.v}</p>
            <p className="text-[10px] text-text-3">{s.l}</p>
          </div>
        ))}
      </div>

      {/* Logout */}
      <button
        onClick={onSignOut}
        className="w-full py-3 rounded-xl border border-rose/30 text-rose font-semibold text-sm flex items-center justify-center gap-2 hover:bg-rose/5 transition-colors"
      >
        <LogOut className="w-4 h-4" /> Déconnexion
      </button>
    </div>
  );
}
