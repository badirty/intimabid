'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft, Store } from 'lucide-react';
import type { Auction, SellerSearchResult } from '@/lib/types';
import { fetchLiveAuctionsBySeller } from '@/lib/db';
import GhostLogo from '@/components/brand/GhostLogo';

export default function SellerShop({
  seller,
  userId,
  onBack,
  onOpenAuction,
}: {
  seller: SellerSearchResult;
  userId: string;
  onBack: () => void;
  onOpenAuction: (auction: Auction) => void;
}) {
  const [auctions, setAuctions] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setAuctions(await fetchLiveAuctionsBySeller(seller.id, userId));
    } finally {
      setLoading(false);
    }
  }, [seller.id, userId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="animate-slide-up">
      <div className="header-dark px-4 py-3 flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white/50 text-xs uppercase tracking-wider font-bold">Boutique</p>
          <p className="text-white font-extrabold truncate" style={{ fontFamily: 'var(--font-display)' }}>
            @{seller.display_name}
          </p>
        </div>
        <div className="ghost-logo-wrap w-9 h-9 rounded-xl flex items-center justify-center">
          <Store className="w-4 h-4 text-accent" />
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        <div className="ui-card p-4 flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-accent/15 flex items-center justify-center shrink-0">
            <GhostLogo size={32} />
          </div>
          <div>
            <p className="font-bold text-text">@{seller.display_name}</p>
            <p className="text-text-3 text-sm mt-0.5">
              {seller.live_count} enchère{seller.live_count !== 1 ? 's' : ''} live
              {seller.total_sales > 0 && ` · ${seller.total_sales} vente${seller.total_sales !== 1 ? 's' : ''}`}
            </p>
          </div>
        </div>

        {loading && <p className="text-text-3 text-sm text-center py-8">Chargement...</p>}

        {!loading && auctions.length === 0 && (
          <div className="ui-card p-8 text-center">
            <p className="text-text-2 text-sm">Aucune enchère live pour le moment</p>
          </div>
        )}

        {!loading && auctions.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onOpenAuction(item)}
            className="ui-card w-full p-4 flex items-center gap-3 text-left hover:border-accent/30 transition-colors"
          >
            <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${item.image_color} shrink-0 overflow-hidden`}>
              {item.image_url && (
                <img src={item.image_url} alt="" className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-text truncate">{item.title}</p>
              <p className="text-accent font-extrabold text-lg mt-1">
                {(item.current_price_cents / 100).toFixed(2)} €
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}