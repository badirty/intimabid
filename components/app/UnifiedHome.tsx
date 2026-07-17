'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Flame, Heart, Plus, Camera, X, Clock, Store, Zap, TrendingUp } from 'lucide-react';
import GhostLogo from '@/components/brand/GhostLogo';
import UserAvatar from '@/components/brand/UserAvatar';
import type { Auction, HomeTab, SellerSearchResult } from '@/lib/types';
import { centsToEuros, eurosToCents, isAuctionLive } from '@/lib/format';
import {
  fetchAuctionById, fetchEndedAuctions, fetchFavorites, fetchLiveAuctions,
  fetchSellerAuctions, fetchTopSellers, buyNow, placeBid, toggleFavorite,
  createAuction, uploadAuctionImage, searchSellers,
  fetchMyActiveBidAuctions, fetchMyWonAuctions, fetchMyLostAuctions,
} from '@/lib/db';
import { useCountdown } from '@/hooks/useCountdown';
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh';
import SkeletonCard from '@/components/shared/SkeletonCard';
import BidModal from '@/components/buyer/BidModal';
import AuctionDetail from '@/components/buyer/AuctionDetail';
import SellerShop from '@/components/buyer/SellerShop';

function hoursUntilEnd(endsAt: string) {
  return (new Date(endsAt).getTime() - Date.now()) / 3_600_000;
}
type SearchMode = 'items' | 'sellers';
const DURATION_PRESETS = [
  { label: '12h', hours: 12 },
  { label: '24h', hours: 24 },
  { label: '36h', hours: 36 },
];

function sellerFromAuction(item: Auction): SellerSearchResult {
  return {
    id: item.seller_id,
    display_name: item.seller_name ?? 'Vendeur',
    live_count: 0,
    total_sales: 0,
    avatar_url: item.seller_avatar_url ?? null,
  };
}

export default function UnifiedHome({
  userId,
  onWalletNeeded,
  onOverlayChange,
  initialAuctionId,
  onAuctionOpened,
  initialSeller,
  onSellerOpened,
}: {
  userId: string;
  onWalletNeeded?: () => void;
  onOverlayChange?: (open: boolean) => void;
  initialAuctionId?: string | null;
  onAuctionOpened?: () => void;
  initialSeller?: SellerSearchResult | null;
  onSellerOpened?: () => void;
}) {
  const [tab, setTab] = useState<HomeTab>('live');
  const [searchMode, setSearchMode] = useState<SearchMode>('items');
  const [search, setSearch] = useState('');
  const [sellerResults, setSellerResults] = useState<SellerSearchResult[]>([]);
  const [topSellers, setTopSellers] = useState<SellerSearchResult[]>([]);
  const [sellerSearchLoading, setSellerSearchLoading] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<SellerSearchResult | null>(initialSeller ?? null);
  const [live, setLive] = useState<Auction[]>([]);
  const [ended, setEnded] = useState<Auction[]>([]);
  const [favorites, setFavorites] = useState<Auction[]>([]);
  const [mySales, setMySales] = useState<Auction[]>([]);
  const [myActiveBids, setMyActiveBids] = useState<Auction[]>([]);
  const [myWins, setMyWins] = useState<Auction[]>([]);
  const [myLost, setMyLost] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidModal, setBidModal] = useState<Auction | null>(null);
  const [detailAuction, setDetailAuction] = useState<Auction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [startPrice, setStartPrice] = useState('5');
  const [durationHours, setDurationHours] = useState(24);
  const [isCustomDuration, setIsCustomDuration] = useState(false);
  const [buyNowPrice, setBuyNowPrice] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  useEffect(() => {
    if (!showCreate) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [showCreate]);

  const load = useCallback(async () => {
    setLoading(true);
    const itemSearch = searchMode === 'items' ? search : '';
    try {
      const [liveData, endedData, favData, salesData, activeBids, wins, lost] = await Promise.all([
        fetchLiveAuctions(userId, itemSearch),
        fetchEndedAuctions(itemSearch),
        fetchFavorites(userId),
        fetchSellerAuctions(userId),
        fetchMyActiveBidAuctions(userId),
        fetchMyWonAuctions(userId),
        fetchMyLostAuctions(userId),
      ]);
      setLive(liveData);
      setEnded(endedData);
      setFavorites(favData);
      setMySales(salesData);
      setMyActiveBids(activeBids);
      setMyWins(wins);
      setMyLost(lost);
    } catch {
      setLive([]); setEnded([]); setFavorites([]); setMySales([]);
    } finally {
      setLoading(false);
    }
  }, [userId, search, searchMode]);

  useEffect(() => { load(); }, [load]);

  useRealtimeRefresh(() => { load(); }, !detailAuction && !selectedSeller && !showCreate);

  useEffect(() => {
    fetchTopSellers(6).then(setTopSellers).catch(() => setTopSellers([]));
  }, []);

  useEffect(() => {
    if (initialSeller) setSelectedSeller(initialSeller);
  }, [initialSeller]);

  useEffect(() => {
    if (!initialAuctionId) return;
    fetchAuctionById(initialAuctionId, userId)
      .then((a) => { if (a) setDetailAuction(a); })
      .finally(() => onAuctionOpened?.());
  }, [initialAuctionId, onAuctionOpened, userId]);

  useEffect(() => {
    onOverlayChange?.(!!detailAuction || !!selectedSeller || showCreate);
  }, [detailAuction, selectedSeller, showCreate, onOverlayChange]);

  useEffect(() => {
    if (searchMode !== 'sellers') {
      setSellerResults([]);
      return;
    }
    const q = search.trim();
    if (!q) {
      setSellerResults([]);
      setSellerSearchLoading(false);
      return;
    }
    setSellerSearchLoading(true);
    const t = setTimeout(() => {
      searchSellers(q)
        .then(setSellerResults)
        .catch(() => setSellerResults([]))
        .finally(() => setSellerSearchLoading(false));
    }, 300);
    return () => clearTimeout(t);
  }, [search, searchMode]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const filterBySearch = (list: Auction[]) => {
    const q = search.trim().toLowerCase();
    if (!q || searchMode !== 'items') return list;
    return list.filter((a) => a.title.toLowerCase().includes(q));
  };

  const liveItems = filterBySearch(live);
  const endingSoon = liveItems.filter((a) => hoursUntilEnd(a.ends_at) <= 2);
  const otherLive = liveItems.filter((a) => hoursUntilEnd(a.ends_at) > 2);
  const favoriteItems = filterBySearch(favorites);
  const endedItems = filterBySearch(ended);

  const showBidError = (e: unknown) => {
    const msg = e instanceof Error ? e.message : 'Erreur';
    setToast(msg);
    if (msg.includes('Solde')) onWalletNeeded?.();
  };

  const handleBid = async (auction: Auction, amountCents: number) => {
    try {
      await placeBid(auction.id, amountCents);
      setToast('Offre placée !');
      await load();
    } catch (e) {
      showBidError(e);
      throw e;
    }
  };

  const handleBuyNow = async (auction: Auction) => {
    try {
      await buyNow(auction.id);
      setToast('Achat immédiat confirmé !');
      await load();
    } catch (e) {
      showBidError(e);
      throw e;
    }
  };

  const openSeller = (seller: SellerSearchResult) => setSelectedSeller(seller);

  const handleFavorite = async (auction: Auction) => {
    await toggleFavorite(userId, auction.id, !!auction.is_favorite);
    await load();
  };

  const handleCreate = async () => {
    if (!createTitle.trim()) { setCreateError('Donne un titre'); return; }
    if (!imageFile) { setCreateError('Une photo est obligatoire'); return; }
    const priceCents = eurosToCents(parseFloat(startPrice.replace(',', '.')));
    if (Number.isNaN(priceCents) || priceCents < 1) { setCreateError('Prix minimum : 0,01 €'); return; }
    if (durationHours < 0.05 || durationHours > 96) { setCreateError('Durée : entre 3 minutes et 96 heures'); return; }

    setCreating(true);
    setCreateError(null);
    try {
      const imageUrl = await uploadAuctionImage(imageFile);
      const buyNowCents = buyNowPrice ? eurosToCents(parseFloat(buyNowPrice.replace(',', '.'))) : undefined;
      await createAuction(
        userId,
        createTitle.trim(),
        priceCents,
        durationHours,
        imageUrl,
        buyNowCents,
        createDescription.trim() || null,
      );
      setCreateTitle('');
      setCreateDescription('');
      setStartPrice('5');
      setDurationHours(24);
      setIsCustomDuration(false);
      setBuyNowPrice('');
      setImageFile(null);
      setImagePreview(null);
      setShowCreate(false);
      setToast('Enchère lancée !');
      await load();
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  if (detailAuction) {
    return (
      <AuctionDetail
        item={detailAuction}
        userId={userId}
        onClose={() => { setDetailAuction(null); load(); }}
        onBid={handleBid}
        onBuyNow={handleBuyNow}
        onFavorite={handleFavorite}
        onWalletNeeded={onWalletNeeded}
        onOpenSeller={(seller) => { setDetailAuction(null); openSeller(seller); }}
      />
    );
  }

  if (selectedSeller) {
    return (
      <SellerShop
        seller={selectedSeller}
        userId={userId}
        onBack={() => { setSelectedSeller(null); onSellerOpened?.(); }}
        onOpenAuction={(auction) => setDetailAuction(auction)}
      />
    );
  }

  const isSellerMode = searchMode === 'sellers';
  const sellerQuery = search.trim();

  return (
    <>
      <div className="animate-slide-up relative">
        <div className="header-dark px-5 pt-2 pb-0">
          <div className="flex items-center justify-between py-2">
            <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold">
              {{
                live: 'Enchères en direct', favorites: 'Mes favoris', selling: 'Mes ventes', ended: 'Terminées',
                mybids: 'Mes offres actives', mywins: 'Mes gains', mylost: 'Perdues',
              }[tab]}
            </h2>
            <button type="button" onClick={() => load()} className="text-[10px] text-accent font-bold">↻ Actualiser</button>
          </div>
          <div className="tab-bar overflow-x-auto flex-nowrap">
            {(['live', 'favorites', 'mybids', 'mywins', 'mylost', 'selling', 'ended'] as const).map((t) => (
              <button key={t} onClick={() => setTab(t)} className={`shrink-0 ${tab === t ? 'active' : ''}`}>
                {{
                  live: 'Live', favorites: 'Favoris', selling: 'Ventes', ended: 'Finies',
                  mybids: 'Offres', mywins: 'Gains', mylost: 'Perdues',
                }[t]}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 py-4 space-y-4">
        <div className="flex gap-2 p-1 rounded-xl bg-white/5 border border-white/8">
          {([
            ['items', 'Articles'],
            ['sellers', 'Vendeurs'],
          ] as const).map(([mode, label]) => (
            <button
              key={mode}
              type="button"
              onClick={() => {
                setSearchMode(mode);
                if (mode === 'items') setSellerResults([]);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                searchMode === mode
                  ? 'bg-accent text-white shadow-sm'
                  : 'text-white/50 hover:text-white/70'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-3" />
          <input
            type="search"
            placeholder={searchMode === 'sellers' ? 'Rechercher un vendeur...' : 'Rechercher un article...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-bar w-full py-3.5 pl-11 pr-4 text-sm"
          />
        </div>

        {toast && <div className="bg-accent/10 text-accent text-sm font-bold px-4 py-2.5 rounded-2xl text-center border border-accent/20">{toast}</div>}

        {isSellerMode && !sellerQuery && topSellers.length > 0 && (
          <div>
            <p className="text-xs text-text-3 uppercase tracking-widest font-bold mb-3 flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-accent" /> Vendeurs actifs
            </p>
            <div className="space-y-2">
              {topSellers.map((seller) => (
                <button
                  key={seller.id}
                  type="button"
                  onClick={() => openSeller(seller)}
                  className="ui-card w-full p-4 flex items-center gap-3 text-left hover:border-accent/30 transition-colors"
                >
                  <UserAvatar src={seller.avatar_url} name={seller.display_name} size={48} rounded="rounded-xl" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text truncate">@{seller.display_name}</p>
                    <p className="text-text-3 text-xs mt-0.5">
                      {seller.live_count} live · {seller.total_sales} vente{seller.total_sales !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <Store className="w-4 h-4 text-text-3 shrink-0" />
                </button>
              ))}
            </div>
          </div>
        )}

        {isSellerMode && !sellerQuery && topSellers.length === 0 && (
          <div className="ui-card p-6 text-center">
            <Store className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="font-bold text-text text-sm">Trouver un vendeur</p>
            <p className="text-text-3 text-xs mt-1">Tape son pseudo pour voir sa boutique</p>
          </div>
        )}

        {isSellerMode && sellerQuery && sellerSearchLoading && (
          <div className="flex flex-col items-center gap-3 py-8">
            <div className="ghost-logo-wrap w-10 h-10 rounded-xl flex items-center justify-center animate-ghost-float">
              <GhostLogo size={26} />
            </div>
            <p className="text-text-3 text-sm">Recherche vendeurs...</p>
          </div>
        )}

        {isSellerMode && sellerQuery && !sellerSearchLoading && sellerResults.length === 0 && (
          <div className="ui-card p-8 text-center">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-bold text-text">Aucun vendeur trouvé</p>
            <p className="text-text-3 text-sm mt-2">Essaie un autre pseudo</p>
          </div>
        )}

        {isSellerMode && sellerQuery && !sellerSearchLoading && sellerResults.map((seller) => (
          <button
            key={seller.id}
            type="button"
            onClick={() => openSeller(seller)}
            className="ui-card w-full p-4 flex items-center gap-3 text-left hover:border-accent/30 transition-colors"
          >
            <UserAvatar src={seller.avatar_url} name={seller.display_name} size={48} rounded="rounded-xl" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-text truncate">@{seller.display_name}</p>
              <p className="text-text-3 text-xs mt-0.5">
                {seller.live_count} live · {seller.total_sales} vente{seller.total_sales !== 1 ? 's' : ''}
              </p>
            </div>
            <Store className="w-4 h-4 text-text-3 shrink-0" />
          </button>
        ))}

        {!isSellerMode && loading && (
          <div className="space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {!isSellerMode && !loading && tab === 'live' && liveItems.length === 0 && (
          <div className="ui-card p-10 text-center">
            <p className="text-4xl mb-3">🕯️</p>
            <p className="font-bold text-text text-lg">Aucune enchère live</p>
            <p className="text-text-3 text-sm mt-2">Lance la première enchère avec le bouton +</p>
          </div>
        )}

        {!isSellerMode && !loading && tab === 'favorites' && favoriteItems.length === 0 && (
          <div className="ui-card p-10 text-center">
            <p className="text-4xl mb-3">💜</p>
            <p className="font-bold text-text text-lg">Aucun favori</p>
            <p className="text-text-3 text-sm mt-2">Tape le cœur sur une enchère pour la retrouver ici</p>
          </div>
        )}

        {!isSellerMode && !loading && tab === 'selling' && mySales.length === 0 && (
          <div className="ui-card p-10 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="font-bold text-text text-lg">Aucune vente en cours</p>
            <p className="text-text-3 text-sm mt-2">Crée une enchère pour commencer à vendre</p>
          </div>
        )}

        {!isSellerMode && !loading && tab === 'ended' && endedItems.length === 0 && (
          <div className="ui-card p-10 text-center">
            <p className="text-4xl mb-3">✨</p>
            <p className="font-bold text-text text-lg">Aucune vente terminée</p>
            <p className="text-text-3 text-sm mt-2">Les ventes terminées apparaîtront ici</p>
          </div>
        )}

        {!isSellerMode && !loading && tab === 'live' && endingSoon.length > 0 && (
          <div className="space-y-3">
            <p className="text-xs text-rose uppercase tracking-widest font-bold flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5" /> Se termine bientôt
            </p>
            {endingSoon.map((item) => (
              <AuctionCard key={item.id} item={item} featured isOwner={item.seller_id === userId}
                onPress={() => setDetailAuction(item)}
                onBid={(cents) => handleBid(item, cents)}
                onBuyNow={() => handleBuyNow(item)}
                onCustomBid={() => setBidModal(item)}
                onFavorite={() => handleFavorite(item)}
                onSellerClick={() => openSeller(sellerFromAuction(item))}
                onBidError={showBidError} />
            ))}
          </div>
        )}

        {!isSellerMode && !loading && tab === 'live' && otherLive.map((item) => (
          <AuctionCard key={item.id} item={item} isOwner={item.seller_id === userId}
            onPress={() => setDetailAuction(item)}
            onBid={(cents) => handleBid(item, cents)}
            onBuyNow={() => handleBuyNow(item)}
            onCustomBid={() => setBidModal(item)}
            onFavorite={() => handleFavorite(item)}
            onSellerClick={() => openSeller(sellerFromAuction(item))}
            onBidError={showBidError} />
        ))}

        {!isSellerMode && !loading && tab === 'favorites' && favoriteItems.map((item) => (
          <AuctionCard key={item.id} item={item} isOwner={item.seller_id === userId}
            onPress={() => setDetailAuction(item)}
            onBid={(cents) => handleBid(item, cents)}
            onBuyNow={() => handleBuyNow(item)}
            onCustomBid={() => setBidModal(item)}
            onFavorite={() => handleFavorite(item)}
            onSellerClick={() => openSeller(sellerFromAuction(item))}
            onBidError={showBidError}
            showEnded={!isAuctionLive(item.status, item.ends_at)} />
        ))}

        {!isSellerMode && !loading && tab === 'selling' && mySales.map((item) => (
          <AuctionCard key={item.id} item={item} isOwner
            onPress={() => setDetailAuction(item)}
            onBid={(cents) => handleBid(item, cents)}
            onCustomBid={() => setBidModal(item)}
            onFavorite={() => handleFavorite(item)}
            onSellerClick={() => openSeller(sellerFromAuction(item))} />
        ))}

        {!isSellerMode && !loading && tab === 'mybids' && myActiveBids.length === 0 && (
          <div className="ui-card p-10 text-center">
            <p className="font-bold text-text">Aucune offre active</p>
            <p className="text-text-3 text-sm mt-2">Enchéris sur une vente live</p>
          </div>
        )}

        {!isSellerMode && !loading && tab === 'mybids' && myActiveBids.map((item) => (
          <AuctionCard key={item.id} item={item} isOwner={item.seller_id === userId}
            onPress={() => setDetailAuction(item)}
            onBid={(cents) => handleBid(item, cents)}
            onBuyNow={() => handleBuyNow(item)}
            onCustomBid={() => setBidModal(item)}
            onFavorite={() => handleFavorite(item)}
            onSellerClick={() => openSeller(sellerFromAuction(item))}
            onBidError={showBidError} />
        ))}

        {!isSellerMode && !loading && tab === 'mywins' && myWins.map((item) => (
          <AuctionCard key={item.id} item={item} showEnded
            onPress={() => setDetailAuction(item)}
            onBid={async () => {}}
            onCustomBid={() => setDetailAuction(item)}
            onFavorite={() => handleFavorite(item)}
            onSellerClick={() => openSeller(sellerFromAuction(item))} />
        ))}

        {!isSellerMode && !loading && tab === 'mylost' && myLost.map((item) => (
          <AuctionCard key={item.id} item={item} showEnded
            onPress={() => setDetailAuction(item)}
            onBid={async () => {}}
            onCustomBid={() => setDetailAuction(item)}
            onFavorite={() => handleFavorite(item)}
            onSellerClick={() => openSeller(sellerFromAuction(item))} />
        ))}

        {!isSellerMode && !loading && tab === 'ended' && endedItems.map((item) => (
          <AuctionCard key={item.id} item={item} isOwner={item.seller_id === userId}
            onPress={() => setDetailAuction(item)}
            onBid={(cents) => handleBid(item, cents)}
            onCustomBid={() => setBidModal(item)}
            onFavorite={() => handleFavorite(item)}
            onSellerClick={() => openSeller(sellerFromAuction(item))}
            showEnded />
        ))}
      </div>
      </div>

      {!showCreate && (
        <button
          type="button"
          onClick={() => { setCreateError(null); setShowCreate(true); }}
          className="fab"
          aria-label="Créer une enchère"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}

      {/* Create sheet — plein écran iPhone */}
      {showCreate && (
        <div
          className="create-modal-overlay animate-slide-up"
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-auction-title"
        >
          <div className="create-modal-panel">
            <header className="create-modal-header">
              <h3
                id="create-auction-title"
                className="font-extrabold text-base text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Nouvelle enchère
              </h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center"
                aria-label="Fermer"
              >
                <X className="w-4 h-4 text-white/80" />
              </button>
            </header>

            <div className="create-modal-body space-y-4">
              {/* 1. Photo */}
              <div className="create-field">
                <label className="form-label">Photo <span className="text-rose">*</span></label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-[16/10] max-h-[180px]">
                    <img src={imagePreview} alt="Aperçu" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => { setImageFile(null); setImagePreview(null); }}
                      className="absolute top-2 right-2 w-9 h-9 rounded-full bg-black/70 flex items-center justify-center"
                    >
                      <X className="w-4 h-4 text-white" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="create-photo-zone"
                  >
                    <Camera className="w-9 h-9 text-accent" />
                    <span className="text-sm font-bold text-white/90">Tap pour ajouter une photo</span>
                    <span className="text-xs text-white/50">JPG · PNG · WebP · max 5 Mo</span>
                  </button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 5 * 1024 * 1024) {
                      setCreateError('Image trop grande (max 5 Mo)');
                      return;
                    }
                    setImageFile(file);
                    setImagePreview(URL.createObjectURL(file));
                    setCreateError(null);
                  }}
                />
              </div>

              {/* 2. Titre */}
              <div className="create-field">
                <label className="form-label" htmlFor="auction-title">Titre</label>
                <input
                  id="auction-title"
                  placeholder="Ex : Ensemble lingerie noire"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="search-bar w-full px-4 py-3 text-sm outline-none"
                />
              </div>

              {/* 3. Description */}
              <div className="create-field">
                <label className="form-label" htmlFor="auction-desc">Description</label>
                <textarea
                  id="auction-desc"
                  placeholder="État, taille, détails sur l'article..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="textarea-bar w-full px-4 py-3 text-sm"
                  rows={3}
                />
              </div>

              {/* 4. Prix */}
              <div className="grid grid-cols-2 gap-3">
                <div className="create-field">
                  <label className="form-label" htmlFor="start-price">Prix de départ</label>
                  <div className="relative">
                    <input
                      id="start-price"
                      type="text"
                      inputMode="decimal"
                      placeholder="5"
                      value={startPrice}
                      onChange={(e) => setStartPrice(e.target.value)}
                      className="search-bar w-full px-3 py-3 text-sm pr-8 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">€</span>
                  </div>
                </div>
                <div className="create-field">
                  <label className="form-label" htmlFor="buy-now">Achat immédiat</label>
                  <div className="relative">
                    <input
                      id="buy-now"
                      type="text"
                      inputMode="decimal"
                      placeholder="Optionnel"
                      value={buyNowPrice}
                      onChange={(e) => setBuyNowPrice(e.target.value)}
                      className="search-bar w-full px-3 py-3 text-sm pr-8 outline-none"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-sm font-bold">€</span>
                  </div>
                </div>
              </div>

              {/* 5. Durée */}
              <div className="create-field">
                <label className="form-label">Durée</label>
                <div className="flex gap-2">
                  {DURATION_PRESETS.map(({ label, hours }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => { setDurationHours(hours); setIsCustomDuration(false); }}
                      className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-all ${
                        !isCustomDuration && durationHours === hours
                          ? 'bg-accent text-white'
                          : 'bg-white/5 border border-white/10 text-white/60'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setIsCustomDuration((v) => !v)}
                  className={`w-full mt-2 py-2 rounded-xl text-xs font-semibold transition-colors ${
                    isCustomDuration
                      ? 'bg-accent/15 text-accent border border-accent/25'
                      : 'text-white/40 border border-white/8'
                  }`}
                >
                  <Clock className="w-3.5 h-3.5 inline mr-1 -mt-0.5" />
                  {isCustomDuration ? formatDuration(durationHours) : 'Durée personnalisée'}
                </button>
                {isCustomDuration && (
                  <div className="pt-1 px-0.5">
                    <input
                      type="range"
                      min="0.05"
                      max="96"
                      step="0.05"
                      value={durationHours}
                      onChange={(e) => setDurationHours(parseFloat(e.target.value))}
                      className="w-full h-2 rounded-full appearance-none bg-white/10 accent-accent cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-white/35 mt-1">
                      <span>3 min</span><span>24h</span><span>48h</span><span>72h</span><span>96h</span>
                    </div>
                  </div>
                )}
              </div>

              {createError && (
                <p className="text-rose text-sm bg-rose/10 border border-rose/20 rounded-xl px-4 py-2.5">
                  {createError}
                </p>
              )}
            </div>

            <footer className="create-modal-footer">
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="btn-accent w-full py-4 text-sm disabled:opacity-60"
              >
                {creating ? 'Lancement...' : "Lancer l'enchère"}
              </button>
            </footer>
          </div>
        </div>
      )}

      {bidModal && (
        <BidModal title={bidModal.title}
          minCents={bidModal.current_price_cents + bidModal.bid_increment_cents}
          onClose={() => setBidModal(null)}
          onSubmit={(cents) => handleBid(bidModal, cents)}
          onWalletNeeded={onWalletNeeded} />
      )}
    </>
  );
}

function formatDuration(hours: number): string {
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  if (hours < 24) return `${hours.toFixed(1)}h`;
  const d = Math.floor(hours / 24);
  const h = hours % 24;
  return d > 0 && h > 0 ? `${d}j ${h.toFixed(0)}h` : d > 0 ? `${d}j` : `${h.toFixed(0)}h`;
}

function AuctionCard({
  item, featured, isOwner, onPress, onBid, onBuyNow, onCustomBid, onFavorite, onSellerClick, onBidError, showEnded,
}: {
  item: Auction; featured?: boolean; isOwner?: boolean; onPress?: () => void;
  onBid: (cents: number) => Promise<void>;
  onBuyNow?: () => Promise<void>;
  onCustomBid: () => void; onFavorite: () => void;
  onSellerClick?: () => void;
  onBidError?: (e: unknown) => void;
  showEnded?: boolean;
}) {
  const countdown = useCountdown(item.ends_at);
  const live = isAuctionLive(item.status, item.ends_at);
  const price = centsToEuros(item.current_price_cents);
  const [bidding, setBidding] = useState(false);
  const [buying, setBuying] = useState(false);
  const buyNowPrice = item.buy_now_price_cents ? centsToEuros(item.buy_now_price_cents) : null;

  const quickBid = async () => {
    setBidding(true);
    try { await onBid(item.current_price_cents + item.bid_increment_cents); }
    catch (e) { onBidError?.(e); }
    finally { setBidding(false); }
  };

  return (
    <div className="ui-card overflow-hidden cursor-pointer group" onClick={onPress}>
      <div className={`relative ${featured ? 'h-56' : 'h-40'} bg-gradient-to-br ${item.image_color}`}>
        {item.image_url && <img src={item.image_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {live && <span className="live-pill absolute top-3 right-3 flex items-center gap-1 animate-live-pulse"><Flame className="w-3 h-3" /> LIVE</span>}
        {live && buyNowPrice && (
          <span className="buy-now-badge absolute bottom-3 left-3 flex items-center gap-1">
            <Zap className="w-3 h-3" /> {buyNowPrice} €
          </span>
        )}
        {showEnded && <span className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">{item.status === 'sold' ? 'VENDU' : 'TERMINÉ'}</span>}
        <button onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors">
          <Heart className={`w-4 h-4 ${item.is_favorite ? 'fill-rose text-rose' : 'text-white'}`} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
          <GhostLogo size={featured ? 64 : 40} />
        </div>
      </div>
      <div className="p-4">
        {onSellerClick ? (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onSellerClick(); }}
            className="text-xs text-accent font-semibold mb-1 hover:underline"
          >
            @{item.seller_name}
          </button>
        ) : (
          <p className="text-xs text-text-3 mb-1">@{item.seller_name}</p>
        )}
        {isOwner && live && (
          <p className="text-[10px] text-pink font-bold mb-1">Ta vente</p>
        )}
        <h2 className="font-bold text-sm text-text leading-snug">{item.title}</h2>
        <div className="flex justify-between items-center mt-3 text-sm">
          <div>
            <p className="text-text-3 text-[11px]">{live ? 'Temps restant' : 'Statut'}</p>
            <p className={`font-bold font-mono text-sm ${live ? 'text-rose' : 'text-text-2'}`}>{countdown}</p>
          </div>
          <div className="text-right">
            <p className="text-text-3 text-[11px]">{item.status === 'sold' ? 'Prix final' : 'Actuel'}</p>
            <p className="font-extrabold text-lg text-text">{price} €</p>
          </div>
        </div>
        {(item.bid_count ?? 0) > 0 && <p className="text-text-3 text-[11px] mt-2">{item.bid_count} offre{item.bid_count !== 1 ? 's' : ''}</p>}
        {live && !isOwner && onBuyNow && buyNowPrice && (
          <button
            onClick={async (e) => {
              e.stopPropagation();
              setBuying(true);
              try { await onBuyNow(); } catch (e) { onBidError?.(e); }
              finally { setBuying(false); }
            }}
            disabled={buying}
            className="btn-accent w-full py-2.5 text-xs mt-3 flex items-center justify-center gap-1"
          >
            <Zap className="w-3.5 h-3.5" />
            {buying ? '...' : `Acheter · ${buyNowPrice} €`}
          </button>
        )}
        {live && !isOwner && (
          <div className="flex gap-2 mt-2">
            <button onClick={(e) => { e.stopPropagation(); quickBid(); }} disabled={bidding} className="btn-accent flex-1 py-2.5 text-xs">
              {bidding ? '...' : `Enchérir · +${centsToEuros(item.bid_increment_cents)} €`}
            </button>
            <button onClick={(e) => { e.stopPropagation(); onCustomBid(); }} className="btn-ghost flex-1 py-2.5 text-xs">Offre perso</button>
          </div>
        )}
      </div>
    </div>
  );
}
