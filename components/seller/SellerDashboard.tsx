'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Shirt, Camera, X } from 'lucide-react';
import { centsToEuros, eurosToCents, IMAGE_COLORS } from '@/lib/format';
import { createAuction, fetchSellerAuctions, fetchWallet, withdrawToBank, uploadAuctionImage } from '@/lib/db';

const DURATIONS: Record<string, number> = { '3j': 3, '5j': 5, '7j': 7 };

export default function SellerDashboard({
  userId,
  onWallet,
}: {
  userId: string;
  onWallet?: () => void;
}) {
  const [duration, setDuration] = useState<'3j' | '5j' | '7j'>('5j');
  const [startPrice, setStartPrice] = useState(25);
  const [title, setTitle] = useState('');
  const [colorIdx, setColorIdx] = useState(0);
  const [balanceCents, setBalanceCents] = useState(0);
  const [sales, setSales] = useState<Awaited<ReturnType<typeof fetchSellerAuctions>>>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup object URL on unmount or preview change
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [w, s] = await Promise.all([fetchWallet(userId), fetchSellerAuctions(userId)]);
      setBalanceCents(w?.balance_cents ?? 0);
      setSales(s);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load(); }, [load]);

  const launch = async () => {
    if (!title.trim()) { setError('Donne un titre à ton article'); return; }
    setCreating(true);
    setError(null);
    try {
      let imageUrl: string | null = null;
      if (imageFile) {
        imageUrl = await uploadAuctionImage(imageFile);
      }
      await createAuction(
        userId,
        title.trim(),
        eurosToCents(startPrice),
        DURATIONS[duration] * 24,
        imageUrl ?? IMAGE_COLORS[colorIdx],
      );
      setTitle('');
      setImageFile(null);
      setImagePreview(null);
      setToast('Enchère lancée !');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setCreating(false);
    }
  };

  const withdraw = async () => {
    if (balanceCents < 100) { setError('Minimum 1 € pour retirer'); return; }
    try {
      const data = await withdrawToBank(balanceCents);
      setToast(data.message ?? 'Virement envoyé');
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur');
    }
  };

  const liveSales = sales.filter((s) => s.status === 'live');
  const pastSales = sales.filter((s) => s.status !== 'live');

  return (
    <div className="animate-slide-up">
      <div className="header-dark px-5 py-4">
        <h1 className="text-2xl font-extrabold tracking-wide text-center" style={{ fontFamily: 'var(--font-display)' }}>
          VENDEUR
        </h1>
        <p className="text-center text-white/50 text-sm mt-1">Dashboard</p>
      </div>

      <div className="px-4 py-4 space-y-5">
        {toast && <div className="bg-seller/10 text-seller text-sm font-semibold px-4 py-2 rounded-xl text-center">{toast}</div>}
        {error && <div className="bg-red-50 text-red-500 text-sm px-4 py-2 rounded-xl">{error}</div>}

        <div className="ui-card px-5 py-4 flex items-center justify-between">
          <div>
            <p className="text-text-3 text-xs uppercase tracking-wider font-semibold">Solde disponible</p>
            <p className="text-3xl font-extrabold text-seller mt-1" style={{ fontFamily: 'var(--font-display)' }}>
              {loading ? '...' : centsToEuros(balanceCents)} €
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <button onClick={withdraw} className="btn-seller px-4 py-2 text-sm rounded-full">Retirer</button>
            <button onClick={onWallet} className="text-buyer text-xs font-bold">Portefeuille →</button>
          </div>
        </div>

        <div className="ui-card p-5">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-text-2 mb-4">Créer une enchère</h2>

          <input
            placeholder="Titre de l'article (ex: Ensemble lingerie noire)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="search-bar w-full px-4 py-3 text-sm mb-4 outline-none"
          />

          {/* Image upload */}
          <div className="mb-4">
            {imagePreview ? (
              <div className="relative rounded-xl overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Aperçu" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className={`w-full rounded-xl py-8 flex flex-col items-center gap-2 bg-gradient-to-br ${IMAGE_COLORS[colorIdx]} relative overflow-hidden`}
              >
                <Camera className="w-10 h-10 text-white/80" />
                <span className="text-sm font-semibold text-white/90">Ajouter une photo · tap pour changer la couleur</span>
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
                  setError('Image trop grande (max 5 Mo)');
                  return;
                }
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
              }}
            />
          </div>

          {!imagePreview && (
            <button
              type="button"
              onClick={() => setColorIdx((i) => (i + 1) % IMAGE_COLORS.length)}
              className={`w-full rounded-xl py-8 flex flex-col items-center gap-2 mb-4 bg-gradient-to-br ${IMAGE_COLORS[colorIdx]} relative overflow-hidden`}
            >
              <Shirt className="w-10 h-10 text-white/80" />
              <span className="text-sm font-semibold text-white/90">Aperçu couleur · tap pour changer</span>
            </button>
          )}

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-text-2">Prix de départ</span>
              <div className="flex items-center gap-2">
                <button onClick={() => setStartPrice((p) => Math.max(10, p - 5))} className="w-8 h-8 rounded-lg border border-border font-bold text-text-2">−</button>
                <span className="font-extrabold text-lg w-12 text-center">{startPrice} €</span>
                <button onClick={() => setStartPrice((p) => p + 5)} className="w-8 h-8 rounded-lg border border-border font-bold text-text-2">+</button>
              </div>
            </div>

            <div>
              <p className="text-sm text-text-2 mb-2">Durée</p>
              <div className="flex gap-2">
                {(['3j', '5j', '7j'] as const).map((d) => (
                  <button key={d} onClick={() => setDuration(d)} className={`duration-pill ${duration === d ? 'active' : ''}`}>{d}</button>
                ))}
              </div>
            </div>
          </div>

          <button onClick={launch} disabled={creating} className="btn-seller w-full py-4 text-sm mt-5 uppercase tracking-wide">
            {creating ? 'Lancement...' : "Lancer l'enchère"}
          </button>
        </div>

        <div className="ui-card p-5">
          <h2 className="font-extrabold text-sm uppercase tracking-wider text-text-2 mb-4">Mes ventes en cours</h2>
          {liveSales.length === 0 ? (
            <p className="text-text-3 text-sm text-center py-4">Aucune vente active</p>
          ) : (
            <div className="space-y-3">
              {liveSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-semibold text-sm text-text">{sale.title}</p>
                    <p className="text-xs text-text-3">{sale.bid_count ?? 0} offres · {centsToEuros(sale.current_price_cents)} €</p>
                  </div>
                  <span className="live-pill text-[10px]">LIVE</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {pastSales.length > 0 && (
          <div className="ui-card p-5">
            <h2 className="font-extrabold text-sm uppercase tracking-wider text-text-2 mb-4">Ventes terminées</h2>
            <div className="space-y-3">
              {pastSales.map((sale) => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="font-semibold text-sm text-text">{sale.title}</p>
                    <p className="text-xs text-text-3">{sale.bid_count ?? 0} offres</p>
                  </div>
                  <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-zinc-100 text-text-2">
                    {sale.status === 'sold' ? 'Vendu' : 'Terminé'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}