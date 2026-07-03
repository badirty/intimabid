'use client';

import { useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Tab, PreferredMode, AppMode } from '@/lib/types';
import { getInitialAppMode } from '@/lib/auth';
import ModeSwitcher from '@/components/layout/ModeSwitcher';
import BottomNav from '@/components/layout/BottomNav';
import BuyerHome from '@/components/buyer/BuyerHome';
import SellerDashboard from '@/components/seller/SellerDashboard';
import ProfileScreen from '@/components/shared/ProfileScreen';
import PlaceholderScreen from '@/components/shared/PlaceholderScreen';

export default function AppShell({
  user,
  preferredMode,
  onSignOut,
  onPreferredModeChange,
}: {
  user: User;
  preferredMode: PreferredMode;
  onSignOut: () => void;
  onPreferredModeChange?: (m: PreferredMode) => void;
}) {
  const [appMode, setAppMode] = useState<AppMode>(getInitialAppMode(preferredMode));
  const [tab, setTab] = useState<Tab>('home');

  const content = () => {
    if (tab === 'profile') {
      return (
        <ProfileScreen
          email={user.email}
          appMode={appMode}
          preferredMode={preferredMode}
          onSignOut={onSignOut}
          onModeChange={(m) => { setAppMode(m); setTab('home'); }}
          onPreferredModeChange={onPreferredModeChange}
        />
      );
    }

    if (tab === 'notifications') {
      return <PlaceholderScreen emoji="🔔" title="Notifications" subtitle="Alertes d'enchères et messages" />;
    }

    if (tab === 'favorites' && appMode === 'seller') {
      return <PlaceholderScreen emoji="❤️" title="Favoris" subtitle="Tes articles sauvegardés" />;
    }

    if (appMode === 'buyer') {
      return <BuyerHome initialTab={tab === 'favorites' ? 'favorites' : 'live'} />;
    }

    return <SellerDashboard />;
  };

  return (
    <div className="app-shell">
      <div
        className="header-dark px-4 py-2 flex justify-center border-b border-white/5 shrink-0"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <ModeSwitcher mode={appMode} onChange={(m) => { setAppMode(m); setTab('home'); }} />
      </div>

      <main className="flex-1 overflow-y-auto pb-20">
        {content()}
      </main>

      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}