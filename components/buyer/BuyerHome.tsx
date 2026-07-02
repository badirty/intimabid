'use client';

import { useState, useEffect } from 'react';
import { Search, Flame } from 'lucide-react';
import { FEATURED_AUCTION, LIVE_AUCTIONS, FAVORITE_AUCTIONS } from '@/lib/data';
import type { LiveAuction } from '@/lib/types';

type BuyerTab = 'live' | 'favorites';

export default function BuyerHome({ initialTab = 'live' }: { initialTab?: BuyerTab }) {
  const [tab, setTab] = useState<BuyerTab>(initialTab);
  const [bidAmount, setBidAmount] = useState(FEATURED_AUCTION.price);

  useEffect(() => {
    setTab(initialTab);
  }, [initialTab]);

  const items = tab === 'live' ? LIVE_AUCTIONS : FAVORITE_AUCTIONS;
  const featured = tab === 'live' ? FEATURED_AUCTION : items[0];

  return (
    <div className="animate-slide-up">
      {/* Header */}
      <div className="header-dark px-5 pt-2 pb-0">
        <h1 className="text-2xl font-extrabold tracking-wide text-center py-3" style={{ fontFamily: 'var(--font-display)' }}>
          ACHETEUR
        </h1>
        <div className="flex border-b border-white/10">
          {(['live', 'favorites'] as BuyerTab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'text-white border-b-[3px] border-buyer'
                  : 'text-white/50'
              }`}
            >
              {t === 'live' ? 'Enchères Live' : 'Favoris'}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
          <input
            type="search"
            placeholder="Rechercher un article..."
            className="search-bar w-full py-3.5 pl-11 pr-4 text-sm outline-none focus:border-buyer transition-colors"
          />
        </div>

        {/* Featured card */}
        {featured && (
          <AuctionCard
            item={featured}
            bidAmount={bidAmount}
            onBid={() => setBidAmount((p) => p + 2)}
            featured
          />
        )}

        {/* Other auctions */}
        {items.filter((i) => i.id !== featured?.id).map((item) => (
          <AuctionCard key={item.id} item={item} bidAmount={item.price} onBid={() => {}} />
        ))}
      </div>
    </div>
  );
}

function AuctionCard({
  item,
  bidAmount,
  onBid,
  featured = false,
}: {
  item: LiveAuction;
  bidAmount: number;
  onBid: () => void;
  featured?: boolean;
}) {
  return (
    <div className="ui-card overflow-hidden">
      <div className={`relative ${featured ? 'h-52' : 'h-36'} bg-gradient-to-br ${item.imageColor}`}>
        {item.live && (
          <span className="live-pill absolute top-3 right-3 flex items-center gap-1">
            <Flame className="w-3 h-3" /> LIVE
          </span>
        )}
        <div className="absolute inset-0 flex items-center justify-center opacity-20 text-6xl">
          👙
        </div>
      </div>

      <div className="p-4">
        {item.seller && (
          <p className="text-xs text-text-3 mb-1">{item.seller}</p>
        )}
        <h2 className="font-bold text-base text-text leading-snug">{item.title}</h2>

        <div className="flex justify-between items-center mt-3 text-sm">
          <div>
            <p className="text-text-3 text-xs">Temps restant</p>
            <p className="font-bold text-live font-mono">{item.timeLeft}</p>
          </div>
          <div className="text-right">
            <p className="text-text-3 text-xs">Prix actuel</p>
            <p className="font-extrabold text-lg text-text">{bidAmount.toFixed(2)} €</p>
          </div>
        </div>

        {featured && (
          <div className="flex gap-2 mt-4">
            <button onClick={onBid} className="btn-buyer flex-1 py-3.5 text-sm">
              PLACER OFFRE (+2€)
            </button>
            <button className="btn-buyer-alt flex-1 py-3.5 text-sm">
              OFFRE PERSO
            </button>
          </div>
        )}

        {!featured && (
          <button className="btn-buyer w-full py-2.5 text-sm mt-3">
            Enchérir · {item.price}€
          </button>
        )}
      </div>
    </div>
  );
}