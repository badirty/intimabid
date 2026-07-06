'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Tab, PreferredMode, AppMode } from '@/lib/types';
import { getInitialAppMode } from '@/lib/auth';
import { getUnreadNotificationCount } from '@/lib/db';
import ModeSwitcher from '@/components/layout/ModeSwitcher';
import BottomNav from '@/components/layout/BottomNav';
import BuyerHome from '@/components/buyer/BuyerHome';
import SellerDashboard from '@/components/seller/SellerDashboard';
import ProfileScreen from '@/components/shared/ProfileScreen';
import WalletScreen from '@/components/wallet/WalletScreen';
import NotificationsScreen from '@/components/notifications/NotificationsScreen';

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
  const [notifCount, setNotifCount] = useState(0);
  const [walletVersion, setWalletVersion] = useState(0);

  const refreshNotifs = useCallback(async () => {
    setNotifCount(await getUnreadNotificationCount(user.id));
  }, [user.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('wallet')) setTab('wallet');
  }, []);

  useEffect(() => { refreshNotifs(); }, [refreshNotifs]);
  useEffect(() => {
    const id = setInterval(refreshNotifs, 30000);
    return () => clearInterval(id);
  }, [refreshNotifs]);

  const goWallet = () => setTab('wallet');
  const bumpWallet = () => setWalletVersion((v) => v + 1);

  const content = () => {
    if (tab === 'wallet') {
      return (
        <WalletScreen
          userId={user.id}
          onBack={() => setTab('profile')}
          onBalanceChange={bumpWallet}
        />
      );
    }
    if (tab === 'profile') {
      return (
        <ProfileScreen
          userId={user.id}
          email={user.email}
          appMode={appMode}
          preferredMode={preferredMode}
          onSignOut={onSignOut}
          onModeChange={(m) => { setAppMode(m); setTab('home'); }}
          onPreferredModeChange={onPreferredModeChange}
          onWallet={goWallet}
          walletVersion={walletVersion}
        />
      );
    }
    if (tab === 'notifications') {
      return <NotificationsScreen userId={user.id} />;
    }
    if (appMode === 'buyer') {
      return (
        <BuyerHome
          userId={user.id}
          initialTab={tab === 'favorites' ? 'favorites' : 'live'}
          onWalletNeeded={goWallet}
        />
      );
    }
    return <SellerDashboard userId={user.id} onWallet={goWallet} />;
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

      <BottomNav active={tab} onChange={(t) => { setTab(t); if (t === 'notifications') refreshNotifs(); }} notifCount={notifCount} />
    </div>
  );
}