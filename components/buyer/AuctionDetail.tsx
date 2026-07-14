'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Flame, Heart, Clock } from 'lucide-react';
import type { Auction } from '@/lib/types';
import { centsToEuros, isAuctionLive } from '@/lib/format';
import { fetchAuctionById, fetchBidHistory } from '@/lib/db';
import { useCountdown } from '@/hooks/useCountdown';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import GhostLogo from '@/components/brand/GhostLogo';
import BidModal from '@/components/buyer/BidModal';

type BidEntry = { bidder_name: string; amount_cents: number; created_at: string };

export default function AuctionDetail({
  item,
  userId,
  onClose,
  onBid,
  onFavorite,
  onWalletNeeded,
}: {
  item: Auction;
  userId: string;
  onClose: () => void;
  onBid: (auction: Auction, amountCents: number) => Promise<void>;
  onFavorite: (auction: Auction) => Promise<void>;
  onWalletNeeded?: () => void;
}) {
  const [currentItem, setCurrentItem] = useState<Auction>(item);
  const countdown = useCountdown(currentItem.ends_at);
  const live = isAuctionLive(currentItem.status, currentItem.ends_at);
  const price = centsToEuros(currentItem.current_price_cents);
  const [bidding, setBidding] = useState(false);
  const [bidHistory, setBidHistory] = useState<BidEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [bidModal, setBidModal] = useState(false);
  const [favving, setFavving] = useState(false);

  useEffect(() => {
    fetchBidHistory(item.id)
      .then(setBidHistory)
      .catch(() => setBidHistory([]))
      .finally(() => setLoadingHistory(false));
  }, [item.id]);

  const refreshAuction = useCallback(async () => {
    const fresh = await fetchAuctionById(currentItem.id);
    if (fresh) setCurrentItem(fresh);
  }, [currentItem.id]);

  const quickBid = useCallback(async () => {
    setBidding(true);
    try {
      await onBid(currentItem, currentItem.current_price_cents + currentItem.bid_increment_cents);
      const [history, fresh] = await Promise.all([
        fetchBidHistory(currentItem.id),
        fetchAuctionById(currentItem.id),
      ]);
      setBidHistory(history);
      if (fresh) setCurrentItem(fresh);
    } catch { /* handled by parent */ }
    finally { setBidding(false); }
  }, [currentItem, onBid]);

  const handleCustomBid = async (cents: number) => {
    await onBid(currentItem, cents);
    const [history, fresh] = await Promise.all([
      fetchBidHistory(currentItem.id),
      fetchAuctionById(currentItem.id),
    ]);
    setBidHistory(history);
    if (fresh) setCurrentItem(fresh);
  };

  const handleFavorite = async () => {
    setFavving(true);
    try {
      await onFavorite(currentItem);
      await refreshAuction();
    } finally {
      setFavving(false);
    }
  };

  return (
    <div className="app-shell relative animate-slide-up">
      {/* Header with back button */}
      <div
        className="header-dark px-4 py-3 flex items-center gap-3 shrink-0 z-10"
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
          <p className="text-white/50 text-xs">{currentItem.seller_name}</p>
        </div>
        <button
          onClick={handleFavorite}
          disabled={favving}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors"
        >
          <Heart className={`w-5 h-5 ${currentItem.is_favorite ? 'fill-red-400 text-red-400' : 'text-white'}`} />
        </button>
      </div>

      <main className="flex-1 overflow-y-auto pb-24">
        {/* Image area */}
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
        </div>

        {/* Price & timer */}
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
              {currentItem.bid_count} offre{currentItem.bid_count !== 1 ? 's' : ''} · Incrément minimum : {centsToEuros(currentItem.bid_increment_cents)} €
            </p>
          )}
        </div>

        {/* Description */}
        {currentItem.description && (
          <div className="px-5 mb-4">
            <p className="text-text-2 text-sm leading-relaxed">{currentItem.description}</p>
          </div>
        )}

        {/* Bid History */}
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
              {bidHistory.map((bid, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between py-2.5 px-4 rounded-xl ${
                    i === 0 ? 'bg-buyer/10 border border-buyer/20' : 'bg-white/70 border border-border'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-sm text-text truncate">{bid.bidder_name}</span>
                    {i === 0 && (
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

      {/* Bottom action bar */}
      {live && (
        <div
          className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] p-4 bg-white/95 backdrop-blur-md border-t border-border z-30"
          style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}
        >
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
        />
      )}
    </div>
  );
}
