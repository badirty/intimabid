'use client';

import { Home, Bell, User } from 'lucide-react';
import type { Tab } from '@/lib/types';

const ITEMS: { tab: Tab; icon: typeof Home; label: string }[] = [
  { tab: 'home', icon: Home, label: 'Home' },
  { tab: 'notifications', icon: Bell, label: 'Notifs' },
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
      <div className="flex justify-around items-center py-2 px-2">
        {ITEMS.map(({ tab, icon: Icon, label }) => {
          const isActive = active === tab || (active === 'wallet' && tab === 'profile');
          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              className={`relative flex flex-col items-center gap-0.5 py-1.5 px-5 transition-colors ${
                isActive ? 'nav-item-active' : 'nav-item'
              }`}
            >
              <Icon className="w-5 h-5" />
              {tab === 'notifications' && notifCount > 0 && (
                <span className="absolute top-0 right-3 min-w-[16px] h-4 bg-rose text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
              <span className="text-[10px] font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
