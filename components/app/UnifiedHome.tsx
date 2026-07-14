'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Search, Flame, Heart, Plus, Camera, X, Sparkles, Zap } from 'lucide-react';
import GhostLogo from '@/components/brand/GhostLogo';
import type { Auction } from '@/lib/types';
import { centsToEuros, eurosToCents, isAuctionLive, IMAGE_COLORS } from '@/lib/format';
import {
  fetchEndedAuctions, fetchFavorites, fetchLiveAuctions, fetchSellerAuctions,
  placeBid, toggleFavorite, createAuction, uploadAuctionImage,
} from '@/lib/db';
import { useCountdown } from '@/hooks/useCountdown';
import BidModal from '@/components/buyer/BidModal';
import AuctionDetail from '@/components/buyer/AuctionDetail';

type HomeTab = 'live' | 'selling' | 'ended';
const DURATIONS: Record<string, number> = { '3j': 3, '5j': 5, '7j': 7 };

export default function UnifiedHome({
  userId,
  onWalletNeeded,
}: {
  userId: string;
  onWalletNeeded?: () => void;
}) {
  const [tab, setTab] = useState<HomeTab>('live');
  const [search, setSearch] = useState('');
  const [live, setLive] = useState<Auction[]>([]);
  const [ended, setEnded] = useState<Auction[]>([]);
  const [favorites, setFavorites] = useState<Auction[]>([]);
  const [mySales, setMySales] = useState<Auction[]>([]);
  const [loading, setLoading] = useState(true);
  const [bidModal, setBidModal] = useState<Auction | null>(null);
  const [detailAuction, setDetailAuction] = useState<Auction | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  // Create form state
  const [createTitle, setCreateTitle] = useState('');
  const [createDescription, setCreateDescription] = useState('');
  const [startPrice, setStartPrice] = useState(25);
  const [duration, setDuration] = useState<'3j' | '5j' | '7j'>('5j');
  const [colorIdx, setColorIdx] = useState(0);
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
    try {
      const [liveData, endedData, favData, salesData] = await Promise.all([
        fetchLiveAuctions(userId, search),
        fetchEndedAuctions(search),
        fetchFavorites(userId),
        fetchSellerAuctions(userId),
      ]);
      setLive(liveData);
      setEnded(endedData);
      setFavorites(favData);
      setMySales(salesData);
    } catch {
      setLive([]);
      setEnded([]);
      setFavorites([]);
      setMySales([]);
    } finally {
      setLoading(false);
    }
  }, [userId, search]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const items = tab === 'live'
    ? [...live, ...favorites.filter((f) => !live.find((l) => l.id === f.id))]
    : tab === 'selling'
    ? mySales
    : ended;

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

  const handleCreate = async () => {
    if (!createTitle.trim()) { setCreateError('Donne un titre'); return; }
    setCreating(true);
    setCreateError(null);
    try {
      let imageUrl: string | null = null;
      if (imageFile) imageUrl = await uploadAuctionImage(imageFile);
      const buyNowCents = buyNowPrice ? eurosToCents(parseFloat(buyNowPrice)) : undefined;
      await createAuction(
        userId,
        createTitle.trim(),
        eurosToCents(startPrice),
        DURATIONS[duration],
        IMAGE_COLORS[colorIdx],
        imageUrl,
        buyNowCents,
        createDescription.trim() || null,
      );
      setCreateTitle('');
      setCreateDescription('');
      setStartPrice(25);
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
        onFavorite={handleFavorite}
        onWalletNeeded={onWalletNeeded}
      />
    );
  }

  return (
    <div className="animate-slide-up relative">
      {/* Header + Tabs */}
      <div className="header-dark px-5 pt-2 pb-0">
        <div className="flex items-center justify-between py-2">
          <h2 className="text-xs uppercase tracking-widest text-white/40 font-bold">
            {tab === 'live' ? 'Enchères en direct' : tab === 'selling' ? 'Mes ventes' : 'Terminées'}
          </h2>
        </div>
        <div className="tab-bar">
          {([
            ['live', 'Live'],
            ['selling', 'Mes ventes'],
            ['ended', 'Terminées'],
          ] as const).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={tab === t ? 'active' : ''}
            >
              {label}
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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-bar w-full py-3.5 pl-11 pr-4 text-sm"
          />
        </div>

        {/* Toast */}
        {toast && (
          <div className="bg-accent/10 text-accent text-sm font-bold px-4 py-2.5 rounded-2xl text-center border border-accent/20">
            {toast}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex flex-col items-center gap-3 py-12">
            <div className="ghost-logo-wrap w-10 h-10 rounded-xl flex items-center justify-center animate-ghost-float">
              <GhostLogo size={26} />
            </div>
            <p className="text-text-3 text-sm">Chargement...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="ui-card p-10 text-center">
            <p className="text-4xl mb-3">
              {tab === 'live' ? '🕯️' : tab === 'selling' ? '📦' : '✨'}
            </p>
            <p className="font-bold text-text text-lg">
              {tab === 'live' && 'Aucune enchère live'}
              {tab === 'selling' && 'Aucune vente en cours'}
              {tab === 'ended' && 'Aucune vente terminée'}
            </p>
            <p className="text-text-3 text-sm mt-2">
              {tab === 'live'
                ? 'Lance la première enchère avec le bouton +'
                : tab === 'selling'
                ? 'Crée une enchère pour commencer à vendre'
                : 'Les ventes terminées apparaîtront ici'}
            </p>
          </div>
        )}

        {/* Auction cards */}
        {!loading && items.map((item, i) => (
          <AuctionCard
            key={item.id}
            item={item}
            featured={i === 0 && tab === 'live'}
            onPress={() => setDetailAuction(item)}
            onBid={(cents) => handleBid(item, cents)}
            onCustomBid={() => setBidModal(item)}
            onFavorite={() => handleFavorite(item)}
            showEnded={tab === 'ended'}
          />
        ))}
      </div>

      {/* Floating Action Button */}
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

      {/* Create Auction Modal — centré */}
      {showCreate && (
        <div
          className="create-modal-overlay"
          onClick={() => setShowCreate(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="create-auction-title"
        >
          <div
            className="create-modal-panel animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3
                id="create-auction-title"
                className="font-extrabold text-lg text-white"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Nouvelle enchère
              </h3>
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/15 transition-colors"
              >
                <X className="w-4 h-4 text-white/70" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Photo */}
              <div>
                <label className="form-label">Photo</label>
                {imagePreview ? (
                  <div className="relative rounded-2xl overflow-hidden aspect-[4/3]">
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
                    className={`create-photo-zone bg-gradient-to-br ${IMAGE_COLORS[colorIdx]}`}
                  >
                    <Camera className="w-10 h-10 text-white/90" />
                    <span className="text-sm font-semibold text-white/90">Ajouter une photo</span>
                    <span className="text-xs text-white/60">JPG, PNG ou WebP · max 5 Mo</span>
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
                {!imagePreview && (
                  <button
                    type="button"
                    onClick={() => setColorIdx((i) => (i + 1) % IMAGE_COLORS.length)}
                    className="mt-2 w-full rounded-xl py-2.5 flex items-center justify-center gap-2 bg-white/5 border border-white/10 hover:bg-white/8 transition-colors"
                  >
                    <span className={`w-4 h-4 rounded-full bg-gradient-to-br ${IMAGE_COLORS[colorIdx]} ring-1 ring-white/20`} />
                    <span className="text-xs text-white/60">Couleur de fond si pas de photo</span>
                  </button>
                )}
              </div>

              {/* Titre */}
              <div>
                <label className="form-label" htmlFor="auction-title">Titre</label>
                <input
                  id="auction-title"
                  placeholder="Ex : Ensemble lingerie noire"
                  value={createTitle}
                  onChange={(e) => setCreateTitle(e.target.value)}
                  className="search-bar w-full px-4 py-3 text-sm outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="form-label" htmlFor="auction-desc">Description</label>
                <textarea
                  id="auction-desc"
                  placeholder="Décris ton article : état, taille, détails..."
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  className="textarea-bar w-full px-4 py-3 text-sm"
                  rows={3}
                />
              </div>

              {/* Prix */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Prix de départ</label>
                  <div className="flex items-center justify-center gap-2 bg-white/5 rounded-xl py-2 border border-white/10">
                    <button
                      type="button"
                      onClick={() => setStartPrice((p) => Math.max(5, p - 5))}
                      className="w-9 h-9 rounded-lg border border-white/15 text-white/70 font-bold hover:bg-white/5"
                    >
                      −
                    </button>
                    <span className="font-extrabold text-lg text-white min-w-[3rem] text-center">{startPrice} €</span>
                    <button
                      type="button"
                      onClick={() => setStartPrice((p) => p + 5)}
                      className="w-9 h-9 rounded-lg border border-white/15 text-white/70 font-bold hover:bg-white/5"
                    >
                      +
                    </button>
                  </div>
                </div>
                <div>
                  <label className="form-label" htmlFor="buy-now">Achat immédiat</label>
                  <input
                    id="buy-now"
                    type="number"
                    placeholder="Optionnel"
                    value={buyNowPrice}
                    onChange={(e) => setBuyNowPrice(e.target.value)}
                    className="search-bar w-full px-3 py-3 text-sm outline-none"
                  />
                </div>
              </div>

              {/* Durée */}
              <div>
                <label className="form-label">Durée</label>
                <div className="flex gap-2">
                  {(['3j', '5j', '7j'] as const).map((d) => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuration(d)}
                      className={`duration-pill flex-1 text-center ${duration === d ? 'active' : ''}`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>

              {createError && (
                <p className="text-rose text-sm bg-rose/10 border border-rose/20 rounded-xl px-4 py-2.5">
                  {createError}
                </p>
              )}

              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="btn-accent w-full py-4 text-sm disabled:opacity-60"
              >
                {creating ? 'Lancement...' : "Lancer l'enchère"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bid Modal */}
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

/* AuctionCard — dark version */
function AuctionCard({
  item, featured, onPress, onBid, onCustomBid, onFavorite, showEnded,
}: {
  item: Auction;
  featured?: boolean;
  onPress?: () => void;
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
    try { await onBid(item.current_price_cents + item.bid_increment_cents); }
    catch { /* handled */ }
    finally { setBidding(false); }
  };

  return (
    <div className="ui-card overflow-hidden cursor-pointer group" onClick={onPress}>
      {/* Image area */}
      <div className={`relative ${featured ? 'h-56' : 'h-40'} bg-gradient-to-br ${item.image_color}`}>
        {item.image_url && (
          <img src={item.image_url} alt={item.title} className="absolute inset-0 w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {live && (
          <span className="live-pill absolute top-3 right-3 flex items-center gap-1 animate-live-pulse">
            <Flame className="w-3 h-3" /> LIVE
          </span>
        )}
        {showEnded && (
          <span className="absolute top-3 right-3 bg-black/60 backdrop-blur text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
            {item.status === 'sold' ? 'VENDU' : 'TERMINÉ'}
          </span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); onFavorite(); }}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center hover:bg-black/60 transition-colors"
        >
          <Heart className={`w-4 h-4 ${item.is_favorite ? 'fill-rose text-rose' : 'text-white'}`} />
        </button>
        <div className="absolute inset-0 flex items-center justify-center opacity-10 group-hover:opacity-20 transition-opacity">
          <GhostLogo size={featured ? 64 : 40} />
        </div>
      </div>

      <div className="p-4">
        <p className="text-xs text-text-3 mb-1">{item.seller_name}</p>
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

        {(item.bid_count ?? 0) > 0 && (
          <p className="text-text-3 text-[11px] mt-2">
            {item.bid_count} offre{item.bid_count !== 1 ? 's' : ''}
          </p>
        )}

        {live && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={(e) => { e.stopPropagation(); quickBid(); }}
              disabled={bidding}
              className="btn-accent flex-1 py-2.5 text-xs"
            >
              {bidding ? '...' : `Enchérir · +${centsToEuros(item.bid_increment_cents)} €`}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onCustomBid(); }}
              className="btn-ghost flex-1 py-2.5 text-xs"
            >
              Offre perso
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
