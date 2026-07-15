'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Tab } from '@/lib/types';
import { getUnreadNotificationCount } from '@/lib/db';
import BadirtyLogo from '@/components/brand/BadirtyLogo';
import GhostLogo from '@/components/brand/GhostLogo';
import BottomNav from '@/components/layout/BottomNav';
import UnifiedHome from '@/components/app/UnifiedHome';
import ProfileScreen from '@/components/shared/ProfileScreen';
import WalletScreen from '@/components/wallet/WalletScreen';
import NotificationsScreen from '@/components/notifications/NotificationsScreen';

export default function AppShell({
  user,
  onSignOut,
}: {
  user: User;
  preferredMode?: string;
  onSignOut: () => void;
  onPreferredModeChange?: (m: string) => void;
}) {
  const [tab, setTab] = useState<Tab>('home');
  const [notifCount, setNotifCount] = useState(0);
  const [walletVersion, setWalletVersion] = useState(0);
  const [hideNav, setHideNav] = useState(false);
  const [openAuctionId, setOpenAuctionId] = useState<string | null>(null);

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

  const handleOpenAuctionFromNotif = (auctionId: string) => {
    setTab('home');
    setOpenAuctionId(auctionId);
  };

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
          appMode="buyer"
          preferredMode="both"
          onSignOut={onSignOut}
          onModeChange={() => setTab('home')}
          onPreferredModeChange={() => {}}
          onWallet={goWallet}
          walletVersion={walletVersion}
        />
      );
    }
    if (tab === 'notifications') {
      return (
        <NotificationsScreen
          userId={user.id}
          onOpenAuction={handleOpenAuctionFromNotif}
        />
      );
    }
    return (
      <UnifiedHome
        userId={user.id}
        onWalletNeeded={goWallet}
        onOverlayChange={setHideNav}
        initialAuctionId={openAuctionId}
        onAuctionOpened={() => setOpenAuctionId(null)}
      />
    );
  };

  return (
    <div className="app-shell">
      {!hideNav && (
        <div
          className="header-dark px-4 py-2.5 flex items-center justify-between shrink-0 z-20 relative"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        >
          <div className="flex items-center gap-2.5">
            <div className="ghost-logo-wrap w-8 h-8 rounded-xl flex items-center justify-center">
              <GhostLogo size={22} />
            </div>
            <BadirtyLogo size="header" className="h-7 w-auto" />
          </div>
        </div>
      )}

      <main className={`flex-1 overflow-y-auto relative z-10 ${hideNav ? '' : 'pb-24'}`}>
        {content()}
      </main>

      {!hideNav && (
        <BottomNav
          active={tab}
          onChange={(t) => { setTab(t); if (t === 'notifications') refreshNotifs(); }}
          notifCount={notifCount}
        />
      )}
    </div>
  );
}