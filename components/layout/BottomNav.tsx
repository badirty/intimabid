'use client';

import { Home, Heart, Bell, User } from 'lucide-react';
import type { Tab } from '@/lib/types';

const ITEMS: { tab: Tab; icon: typeof Home; label: string }[] = [
  { tab: 'home', icon: Home, label: 'Home' },
  { tab: 'favorites', icon: Heart, label: 'Favoris' },
  { tab: 'notifications', icon: Bell, label: 'Notifs' },
  { tab: 'profile', icon: User, label: 'Profil' },
];

export default function BottomNav({
  active,
  onChange,
}: {
  active: Tab;
  onChange: (t: Tab) => void;
}) {
  return (
    <nav className="bottom-nav fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[390px] z-50"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="flex justify-around items-center py-2 px-2">
        {ITEMS.map(({ tab, icon: Icon, label }) => {
          const isActive = active === tab;
          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-4 transition-colors ${
                isActive ? 'nav-item-active' : 'nav-item'
              }`}
            >
              <Icon className="w-5 h-5" fill={isActive && tab === 'favorites' ? 'currentColor' : 'none'} />
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}