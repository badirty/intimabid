'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { SellerSearchResult, Tab } from '@/lib/types';
import { fetchProfileById, fetchWallet, getUnreadNotificationCount } from '@/lib/db';
import { centsToEuros } from '@/lib/format';
import GhostLogo from '@/components/brand/GhostLogo';
import BottomNav from '@/components/layout/BottomNav';
import UnifiedHome from '@/components/app/UnifiedHome';
import ProfileScreen from '@/components/shared/ProfileScreen';
import WalletScreen from '@/components/wallet/WalletScreen';
import NotificationsScreen from '@/components/notifications/NotificationsScreen';
import OrdersScreen from '@/components/orders/OrdersScreen';
import FirstSessionTips from '@/components/onboarding/FirstSessionTips';

export default function AppShell({
  user,
  onSignOut,
  initialAuctionId,
  initialSellerId,
}: {
  user: User;
  onSignOut: () => void;
  initialAuctionId?: string;
  initialSellerId?: string;
}) {
  const [tab, setTab] = useState<Tab>('home');
  const [ordersMode, setOrdersMode] = useState<'buyer' | 'seller'>('buyer');
  const [notifCount, setNotifCount] = useState(0);
  const [walletVersion, setWalletVersion] = useState(0);
  const [balanceCents, setBalanceCents] = useState(0);
  const [hideNav, setHideNav] = useState(false);
  const [openAuctionId, setOpenAuctionId] = useState<string | null>(initialAuctionId ?? null);
  const [homeResetKey, setHomeResetKey] = useState(0);
  const [profileShop, setProfileShop] = useState<SellerSearchResult | null>(null);
  const [deepLinkSeller, setDeepLinkSeller] = useState<SellerSearchResult | null>(null);

  useEffect(() => {
    if (!initialSellerId) return;
    fetchProfileById(initialSellerId, user.id).then((s) => { if (s) setDeepLinkSeller(s); });
  }, [initialSellerId, user.id]);

  const refreshNotifs = useCallback(async () => {
    setNotifCount(await getUnreadNotificationCount(user.id));
  }, [user.id]);

  const refreshBalance = useCallback(async () => {
    const w = await fetchWallet(user.id);
    setBalanceCents(w?.balance_cents ?? 0);
  }, [user.id]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('wallet')) setTab('wallet');
  }, []);

  useEffect(() => { refreshNotifs(); refreshBalance(); }, [refreshNotifs, refreshBalance]);
  useEffect(() => {
    const id = setInterval(() => { refreshNotifs(); refreshBalance(); }, 30000);
    return () => clearInterval(id);
  }, [refreshNotifs, refreshBalance]);

  const goWallet = () => setTab('wallet');
  const bumpWallet = () => { setWalletVersion((v) => v + 1); refreshBalance(); };

  const handleOpenAuctionFromNotif = (auctionId: string) => {
    setTab('home');
    setOpenAuctionId(auctionId);
  };

  const handleOpenOrdersFromNotif = (mode: 'buyer' | 'seller') => {
    setOrdersMode(mode);
    setTab('orders');
  };

  const goHome = () => {
    setTab('home');
    setOpenAuctionId(null);
    setProfileShop(null);
    setDeepLinkSeller(null);
    setHomeResetKey((k) => k + 1);
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
    if (tab === 'orders') {
      return (
        <div>
          <div className="px-4 pt-4 flex gap-2">
            {(['buyer', 'seller'] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setOrdersMode(m)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold ${ordersMode === m ? 'bg-accent text-white' : 'bg-white/5 text-text-3'}`}
              >
                {m === 'buyer' ? 'Achats' : 'Expéditions'}
              </button>
            ))}
          </div>
          <OrdersScreen userId={user.id} mode={ordersMode} />
        </div>
      );
    }
    if (tab === 'profile') {
      return (
        <ProfileScreen
          user={user}
          onSignOut={onSignOut}
          onWallet={goWallet}
          onOpenShop={(seller) => { setProfileShop(seller); setTab('home'); }}
          onOpenOrders={() => setTab('orders')}
          walletVersion={walletVersion}
        />
      );
    }
    if (tab === 'notifications') {
      return (
        <NotificationsScreen
          userId={user.id}
          onOpenAuction={handleOpenAuctionFromNotif}
          onOpenOrders={handleOpenOrdersFromNotif}
        />
      );
    }
    return (
      <>
        <FirstSessionTips />
        <UnifiedHome
          key={homeResetKey}
          userId={user.id}
          onWalletNeeded={goWallet}
          onOverlayChange={setHideNav}
          initialAuctionId={openAuctionId}
          onAuctionOpened={() => setOpenAuctionId(null)}
          initialSeller={profileShop ?? deepLinkSeller}
          onSellerOpened={() => { setProfileShop(null); setDeepLinkSeller(null); }}
        />
      </>
    );
  };

  return (
    <div className="app-shell">
      {!hideNav && (
        <div
          className="header-dark px-4 py-2.5 flex items-center justify-between shrink-0 z-20 relative"
          style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
        >
          <button
            type="button"
            onClick={goHome}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity"
          >
            <div className="ghost-logo-wrap w-8 h-8 rounded-xl flex items-center justify-center">
              <GhostLogo size={22} />
            </div>
            <span className="text-sm font-extrabold tracking-wider text-white/90" style={{ fontFamily: 'var(--font-display)' }}>
              badirty
            </span>
          </button>
          <button
            type="button"
            onClick={goWallet}
            className="text-xs font-bold text-white/70 bg-white/10 px-3 py-1.5 rounded-full hover:bg-white/15 transition-colors tabular-nums"
          >
            {centsToEuros(balanceCents)} €
          </button>
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