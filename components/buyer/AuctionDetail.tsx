'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Flame, Heart, Clock, Zap } from 'lucide-react';
import type { Auction, SellerSearchResult } from '@/lib/types';
import { centsToEuros, isAuctionLive } from '@/lib/format';
import { fetchAuctionById, fetchBidHistory } from '@/lib/db';
import { useCountdown } from '@/hooks/useCountdown';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import GhostLogo from '@/components/brand/GhostLogo';
import UserAvatar from '@/components/brand/UserAvatar';
import BidModal from '@/components/buyer/BidModal';

type BidEntry = {
  bidder_id: string;
  bidder_name: string;
  bidder_avatar_url: string | null;
  amount_cents: number;
  created_at: string;
};

export default function AuctionDetail({
  item,
  userId,
  onClose,
  onBid,
  onBuyNow,
  onFavorite,
  onWalletNeeded,
  onOpenSeller,
}: {
  item: Auction;
  userId: string;
  onClose: () => void;
  onBid: (auction: Auction, amountCents: number) => Promise<void>;
  onBuyNow?: (auction: Auction) => Promise<void>;
  onFavorite: (auction: Auction) => Promise<void>;
  onWalletNeeded?: () => void;
  onOpenSeller?: (seller: SellerSearchResult) => void;
}) {
  const [currentItem, setCurrentItem] = useState<Auction>(item);
  const countdown = useCountdown(currentItem.ends_at);
  const live = isAuctionLive(currentItem.status, currentItem.ends_at);
  const isOwner = currentItem.seller_id === userId;
  const price = centsToEuros(currentItem.current_price_cents);
  const buyNowPrice = currentItem.buy_now_price_cents
    ? centsToEuros(currentItem.buy_now_price_cents)
    : null;
  const [bidding, setBidding] = useState(false);
  const [buying, setBuying] = useState(false);
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [bidModal, setBidModal] = useState(false);
  const [favving, setFavving] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const refresh = useCallback(async () => {
    const [history, fresh] = await Promise.all([
      fetchBidHistory(item.id),
      fetchAuctionById(item.id, userId),
    ]);
    setBidHistory(history);
    if (fresh) setCurrentItem(fresh);
  }, [item.id, userId]);

  useEffect(() => {
    refresh()
      .catch(() => setBidHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [refresh]);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => { refresh().catch(() => {}); }, 10000);
    return () => clearInterval(id);
  }, [live, refresh]);

  const openSeller = () => {
    onOpenSeller?.({
      id: currentItem.seller_id,
      display_name: currentItem.seller_name ?? 'Vendeur',
      live_count: 0,
      total_sales: 0,
      avatar_url: currentItem.seller_avatar_url ?? null,
    });
  };

  const openBidderShop = (bid: BidEntry) => {
    onOpenSeller?.({
      id: bid.bidder_id,
      display_name: bid.bidder_name,
      live_count: 0,
      total_sales: 0,
      avatar_url: bid.bidder_avatar_url,
    });
  };

  const quickBid = useCallback(async () => {
    setBidding(true);
    try {
      await onBid(currentItem, currentItem.current_price_cents + currentItem.bid_increment_cents);
      await refresh();
    } catch { /* parent toast */ }
    finally { setBidding(false); }
  }, [currentItem, onBid, refresh]);

  const handleBuyNow = async () => {
    if (!onBuyNow) return;
    setBuying(true);
    try {
      await onBuyNow(currentItem);
      onClose();
    } catch { /* parent */ }
    finally { setBuying(false); }
  };

  const handleCustomBid = async (cents: number) => {
    await onBid(currentItem, cents);
    await refresh();
  };

  const handleFavorite = async () => {
    setFavving(true);
    try {
      await onFavorite(currentItem);
      const fresh = await fetchAuctionById(currentItem.id, userId);
      if (fresh) setCurrentItem(fresh);
    } finally {
      setFavving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col animate-slide-up left-1/2 -translate-x-1/2 w-full max-w-[430px]"
      style={{ background: 'linear-gradient(180deg, #06040a 0%, #0d0b18 100%)' }}
    >
      <div
        className="header-dark px-4 py-3 flex items-center gap-3 shrink-0"
        style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{currentItem.title}</p>
          {onOpenSeller ? (
            <button type="button" onClick={openSeller} className="text-accent text-xs font-semibold hover:underline">
              @{currentItem.seller_name}
            </button>
          ) : (
            <p className="text-white/50 text-xs">@{currentItem.seller_name}</p>
          )}
        </div>
        <button
          onClick={handleFavorite}
          disabled={favving}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <Heart className={`w-5 h-5 ${currentItem.is_favorite ? 'fill-red-400 text-red-400' : 'text-white'}`} />
        </button>
      </div>

      <main className="flex-1 overflow-y-auto pb-36">
        <div className={`relative h-64 sm:h-72 bg-gradient-to-br ${currentItem.image_color} flex items-center justify-center`}>
          {currentItem.image_url && (
            <img src={currentItem.image_url} alt={currentItem.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
          {!currentItem.image_url && (
            <div className="opacity-20">
              <GhostLogo size={100} />
            </div>
          )}
          {live && (
            <span className="live-pill absolute top-4 right-4 flex items-center gap-1">
              <Flame className="w-3 h-3" /> LIVE
            </span>
          )}
          {live && buyNowPrice && !isOwner && (
            <span className="buy-now-badge absolute top-4 left-4 flex items-center gap-1">
              <Zap className="w-3 h-3" /> {buyNowPrice} €
            </span>
          )}
          {isOwner && (
            <span className="absolute top-4 left-4 bg-pink/80 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
              Ta vente
            </span>
          )}
        </div>

        <div className="px-5 py-4">
          <div className="flex items-baseline justify-between">
            <div>
              <p className="text-text-3 text-xs uppercase font-bold tracking-wider">
                {live ? 'Prix actuel' : currentItem.status === 'sold' ? 'Prix final' : 'Terminé'}
              </p>
              <p
                className="text-4xl font-extrabold text-text mt-1"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {price} €
              </p>
            </div>
            <div className="text-right">
              <p className="text-text-3 text-xs uppercase font-bold tracking-wider">
                {live ? 'Temps restant' : 'Statut'}
              </p>
              <p className={`text-xl font-bold font-mono mt-1 ${live ? 'text-live' : 'text-text-2'}`}>
                {countdown}
              </p>
            </div>
          </div>

          {(currentItem.bid_count ?? 0) > 0 && (
            <p className="text-text-2 text-sm mt-3">
              {currentItem.bid_count} offre{currentItem.bid_count !== 1 ? 's' : ''} · Incrément : {centsToEuros(currentItem.bid_increment_cents)} €
            </p>
          )}
          {live && buyNowPrice && !isOwner && (
            <p className="text-accent text-sm font-semibold mt-2">
              Achat immédiat disponible à {buyNowPrice} €
            </p>
          )}
        </div>

        {currentItem.description && (
          <div className="px-5 mb-4">
            <p className="text-text-2 text-sm leading-relaxed">{currentItem.description}</p>
          </div>
        )}

        <div className="px-5 mb-4">
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-text-2 mb-3 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Historique des offres
          </h3>
          {loadingHistory ? (
            <p className="text-text-3 text-sm py-4 text-center">Chargement...</p>
          ) : bidHistory.length === 0 ? (
            <div className="ui-card p-4 text-center">
              <p className="text-text-3 text-sm">Aucune offre pour le moment</p>
              <p className="text-text-3 text-xs mt-1">Sois le premier à enchérir !</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {bidHistory.map((bid) => (
                <div
                  key={`${bid.created_at}-${bid.amount_cents}`}
                  className={`flex items-center justify-between py-2.5 px-4 rounded-xl ${
                    bid === bidHistory[0] ? 'bid-history-row-top' : 'bid-history-row'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <UserAvatar src={bid.bidder_avatar_url} name={bid.bidder_name} size={28} />
                    {onOpenSeller ? (
                      <button
                        type="button"
                        onClick={() => openBidderShop(bid)}
                        className="font-bold text-sm text-text truncate hover:text-accent"
                      >
                        @{bid.bidder_name}
                      </button>
                    ) : (
                      <span className="font-bold text-sm text-text truncate">@{bid.bidder_name}</span>
                    )}
                    {bid === bidHistory[0] && (
                      <span className="text-[10px] bg-buyer text-white px-1.5 py-0.5 rounded-full font-bold shrink-0">
                        TOP
                      </span>
                    )}
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <p className="font-extrabold text-sm text-text">{centsToEuros(bid.amount_cents)} €</p>
                    <p className="text-[10px] text-text-3">
                      {formatDistanceToNow(new Date(bid.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {live && !isOwner && (
        <div
          className="detail-action-bar fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-4 z-[70]"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
          {buyNowPrice && onBuyNow && (
            <button
              onClick={handleBuyNow}
              disabled={buying}
              className="btn-accent w-full py-3 text-sm mb-2 flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {buying ? '...' : `Acheter maintenant · ${buyNowPrice} €`}
            </button>
          )}
          <div className="flex gap-2">
            <button
              onClick={quickBid}
              disabled={bidding}
              className="btn-buyer flex-1 py-3.5 text-sm"
            >
              {bidding ? '...' : `Enchérir (+${centsToEuros(currentItem.bid_increment_cents)} €)`}
            </button>
            <button
              onClick={() => setBidModal(true)}
              className="btn-buyer-alt flex-[0.6] py-3.5 text-sm"
            >
              Offre perso
            </button>
          </div>
        </div>
      )}

      {bidModal && (
        <BidModal
          title={currentItem.title}
          minCents={currentItem.current_price_cents + currentItem.bid_increment_cents}
          onClose={() => setBidModal(false)}
          onSubmit={handleCustomBid}
          onWalletNeeded={onWalletNeeded}
        />
      )}
    </div>
  );
}