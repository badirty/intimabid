'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search, Flame, Heart } from 'lucide-react';
import type { Auction } from '@/lib/types';
import { centsToEuros, isAuctionLive } from '@/lib/format';
import { fetchEndedAuctions, fetchFavorites, fetchLiveAuctions, placeBid, toggleFavorite } from '@/lib/db';
import { useCountdown } from '@/hooks/useCountdown';
import BidModal from '@/components/buyer/BidModal';

type BuyerTab = 'live' | 'favorites' | 'ended';

export default function BuyerHome({
  userId,
  initialTab = 'live',
  onWalletNeeded,
}: {
  userId: string;
  initialTab?: BuyerTab;
  onWalletNeeded?: () => void;
}) {
  const [tab, setTab] = useState<BuyerTab>(initialTab === 'favorites' ? 'favorites' : 'live');
  const [search, setSearch] = useState('');
  const [live, setLive] = useState<Auction[]>([]);
  const [ended, setEnded] = useState<Auction[]>([]);
  const [favorites, setFavorites] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidModal, setBidModal] = useState<Auction | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [liveData, endedData, favData] = await Promise.all([
        fetchLiveAuctions(userId, search),
        fetchEndedAuctions(search),
        fetchFavorites(userId),
      ]);
      setLive(liveData);
      setEnded(endedData);
      setFavorites(favData);
    } catch {
      setLive([]);
      setEnded([]);
      setFavorites([]);
    } finally {
      setLoading(false);
    }
  }, [userId, search]);

  useEffect(() => { setTab(initialTab === 'favorites' ? 'favorites' : 'live'); }, [initialTab]);
  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const items = tab === 'live' ? live : tab === 'favorites' ? favorites : ended;

  const handleBid = async (auction: Auction, amountCents: number) => {
    try {
      await placeBid(auction.id, amountCents);
      setToast('Offre placée !');
      await load();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erreur';
      if (msg.includes('Solde')) onWalletNeeded?.();
      throw e;
    }
  };

  const handleFavorite = async (auction: Auction) => {
    await toggleFavorite(userId, auction.id, !!auction.is_favorite);
    await load();
  };

  return (
    <div className="animate-slide-up">
      <div className="header-dark px-5 pt-2 pb-0">
        <h1 className="text-2xl font-extrabold tracking-wide text-center py-3" style={{ fontFamily: 'var(--font-display)' }}>
          ACHETEUR
        </h1>
        <div className="flex border-b border-white/10">
          {([
            ['live', 'Enchères Live'],
            ['favorites', 'Favoris'],
            ['ended', 'Terminées'],
          ] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-xs font-semibold transition-colors ${
                tab === t ? 'text-white border-b-[3px] border-buyer' : 'text-white/50'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
          <input
            type="search"
            placeholder="Rechercher un article..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-bar w-full py-3.5 pl-11 pr-4 text-sm outline-none focus:border-buyer transition-colors"
          />
        </div>

        {toast && (
          <div className="bg-seller/10 text-seller text-sm font-semibold px-4 py-2 rounded-xl text-center">{toast}</div>
        )}

        {loading && <p className="text-center text-text-3 text-sm py-8">Chargement...</p>}

        {!loading && items.length === 0 && (
          <div className="ui-card p-8 text-center">
            <p className="text-4xl mb-3">{tab === 'live' ? '🔥' : tab === 'favorites' ? '❤️' : '✓'}</p>
            <p className="font-bold text-text">
              {tab === 'live' && 'Aucune enchère live pour le moment'}
              {tab === 'favorites' && 'Aucun favori'}
              {tab === 'ended' && 'Aucune vente terminée'}
            </p>
            <p className="text-text-3 text-sm mt-2">
              {tab === 'live' ? 'Passe en mode Vendeur pour lancer une enchère !' : 'Explore les enchères live'}
            </p>
          </div>
        )}

        {!loading && items.map((item, i) => (
          <AuctionCard
            key={item.id}
            item={item}
            featured={i === 0 && tab === 'live'}
            onBid={(cents) => handleBid(item, cents)}
            onCustomBid={() => setBidModal(item)}
            onFavorite={() => handleFavorite(item)}
            showEnded={tab === 'ended'}
          />
        ))}
      </div>

      {bidModal && (
        <BidModal
          title={bidModal.title}
          minCents={bidModal.current_price_cents + bidModal.bid_increment_cents}
          onClose={() => setBidModal(null)}
          onSubmit={(cents) => handleBid(bidModal, cents)}
        />
      )}
    </div>
  );
}

function AuctionCard({
  item,
  featured,
  onBid,
  onCustomBid,
  onFavorite,
  showEnded,
}: {
  item: Auction;
  featured?: boolean;
  onBid: (cents: number) => Promise<void>;
  onCustomBid: () => void;
  onFavorite: () => void;
  showEnded?: boolean;
}) {
  const countdown = useCountdown(item.ends_at);
  const live = isAuctionLive(item.status, item.ends_at);
  const price = centsToEuros(item.current_price_cents);
  const [bidding, setBidding] = useState(false);

  const quickBid = async () => {
    setBidding(true);
    try {
      await onBid(item.current_price_cents + item.bid_increment_cents);
    } catch { /* modal/toast handles */ }
    finally { setBidding(false); }
  };

  return (
    <div className="ui-card overflow-hidden">
      <div className={`relative ${featured ? 'h-52' : 'h-36'} bg-gradient-to-br ${item.image_color}`}>
        {live && (
          <span className="live-pill absolute top-3 right-3 flex items-center gap-1">
            <Flame className="w-3 h-3" /> LIVE
          </span>
        )}
        {showEnded && (
          <span className="absolute top-3 right-3 bg-zinc-800 text-white text-[11px] font-bold px-2 py-1 rounded-md">
            {item.status === 'sold' ? 'VENDU' : 'TERMINÉ'}
          </span>
        )}
        <button
          onClick={onFavorite}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/30 flex items-center justify-center"
        >
          <Heart className={`w-4 h-4 ${item.is_favorite ? 'fill-red-500 text-red-500' : 'text-white'}`} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center opacity-20 text-6xl">👙</div>
      </div>

      <div className="p-4">
        <p className="text-xs text-text-3 mb-1">{item.seller_name}</p>
        <h2 className="font-bold text-base text-text leading-snug">{item.title}</h2>

        <div className="flex justify-between items-center mt-3 text-sm">
          <div>
            <p className="text-text-3 text-xs">{live ? 'Temps restant' : 'Statut'}</p>
            <p className={`font-bold font-mono ${live ? 'text-live' : 'text-text-2'}`}>{countdown}</p>
          </div>
          <div className="text-right">
            <p className="text-text-3 text-xs">{item.status === 'sold' ? 'Prix final' : 'Prix actuel'}</p>
            <p className="font-extrabold text-lg text-text">{price} €</p>
          </div>
        </div>

        {(item.bid_count ?? 0) > 0 && (
          <p className="text-text-3 text-xs mt-2">{item.bid_count} offre{(item.bid_count ?? 0) > 1 ? 's' : ''}</p>
        )}

        {live && featured && (
          <div className="flex gap-2 mt-4">
            <button onClick={quickBid} disabled={bidding} className="btn-buyer flex-1 py-3.5 text-sm">
              {bidding ? '...' : `PLACER OFFRE (+${centsToEuros(item.bid_increment_cents)}€)`}
            </button>
            <button onClick={onCustomBid} className="btn-buyer-alt flex-1 py-3.5 text-sm">OFFRE PERSO</button>
          </div>
        )}

        {live && !featured && (
          <button onClick={quickBid} disabled={bidding} className="btn-buyer w-full py-2.5 text-sm mt-3">
            {bidding ? '...' : `Enchérir · ${price} €`}
          </button>
        )}
      </div>
    </div>
  );
}