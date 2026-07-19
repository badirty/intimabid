'use client';

import { Home, Bell, User, Package } from 'lucide-react';
import type { Tab } from '@/lib/types';

const ITEMS: { tab: Tab; icon: typeof Home; label: string }[] = [
  { tab: 'home', icon: Home, label: 'Accueil' },
  { tab: 'orders', icon: Package, label: 'Commandes' },
  { tab: 'notifications', icon: Bell, label: 'Alertes' },
  { tab: 'profile', icon: User, label: 'Profil' },
];

export default function BottomNav({
  active,
  onChange,
  notifCount = 0,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
  notifCount?: number;
}) {
  return (
    <nav
      className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex justify-around items-center py-2 px-1">
        {ITEMS.map(({ tab, icon: Icon, label }) => {
          const isActive = active === tab || (active === 'wallet' && tab === 'profile');
          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 transition-all duration-200 hover:scale-105 ${
                isActive ? 'nav-item-active' : 'nav-item'
              }`}
            >
              <div className="relative">
                <Icon className={`w-5 h-5 transition-all duration-200 ${isActive ? 'drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]' : ''}`} />
                {tab === 'notifications' && notifCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 bg-gradient-to-r from-rose to-pink text-white text-[8px] font-bold rounded-full flex items-center justify-center px-1 shadow-lg shadow-rose/30">
                    {notifCount > 9 ? '9+' : notifCount}
                  </span>
                )}
              </div>
              <span className={`text-[9px] font-semibold transition-all duration-200 ${isActive ? 'tracking-wider' : ''}`}>{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}