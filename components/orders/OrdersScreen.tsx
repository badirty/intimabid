'use client';

import { useCallback, useEffect, useState } from 'react';
import { Package, Truck, MapPin, Check } from 'lucide-react';
import type { Order } from '@/lib/types';
import { centsToEuros } from '@/lib/format';
import {
  confirmOrderDelivered, fetchBuyerOrders, fetchSellerOrders, fetchUserAddress,
  markOrderShipped, saveShippingAddress, submitOrderAddress,
} from '@/lib/db';

const STATUS_LABEL: Record<Order['status'], string> = {
  pending_address: 'Adresse requise',
  awaiting_shipment: 'À expédier',
  shipped: 'Expédié',
  delivered: 'Reçu',
  cancelled: 'Annulé',
};

export default function OrdersScreen({ userId, mode }: { userId: string; mode: 'buyer' | 'seller' }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [addressForm, setAddressForm] = useState({
    full_name: '', line1: '', line2: '', city: '', postal_code: '', country: 'FR',
  });

  const load = useCallback(async () => {
    setLoading(true);
    const data = mode === 'buyer' ? await fetchBuyerOrders(userId) : await fetchSellerOrders(userId);
    setOrders(data);
    setLoading(false);
  }, [userId, mode]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (mode !== 'buyer') return;
    fetchUserAddress(userId).then((a) => {
      if (a) setAddressForm({
        full_name: a.full_name,
        line1: a.line1,
        line2: a.line2 ?? '',
        city: a.city,
        postal_code: a.postal_code,
        country: a.country,
      });
    }).catch(() => {});
  }, [userId, mode]);

  const run = async (fn: () => Promise<void>) => {
    setError(null);
    setMsg(null);
    try { await fn(); setMsg('OK ✓'); await load(); }
    catch (e) { setError(e instanceof Error ? e.message : 'Erreur'); }
  };

  return (
    <div className="animate-slide-up px-4 py-6">
      <h1 className="text-xl font-extrabold mb-1 flex items-center gap-2" style={{ fontFamily: 'var(--font-display)' }}>
        <Package className="w-5 h-5 text-accent" />
        {mode === 'buyer' ? 'Mes achats' : 'À expédier'}
      </h1>
      <p className="text-text-3 text-xs mb-4">{mode === 'buyer' ? 'Gains et livraisons' : 'Commandes de tes acheteurs'}</p>

      {msg && <p className="text-accent text-sm font-semibold mb-3 text-center">{msg}</p>}
      {error && <p className="text-rose text-sm mb-3 text-center">{error}</p>}

      {mode === 'buyer' && (
        <div className="ui-card p-4 mb-4 space-y-2">
          <p className="text-xs font-bold text-text-2 flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> Mon adresse</p>
          {(['full_name', 'line1', 'line2', 'city', 'postal_code'] as const).map((k) => (
            <input
              key={k}
              placeholder={{ full_name: 'Nom complet', line1: 'Adresse', line2: 'Complément', city: 'Ville', postal_code: 'Code postal' }[k]}
              value={addressForm[k]}
              onChange={(e) => setAddressForm((f) => ({ ...f, [k]: e.target.value }))}
              className="search-bar w-full px-3 py-2.5 text-sm"
            />
          ))}
          <button
            type="button"
            onClick={() => run(() => saveShippingAddress(addressForm))}
            className="btn-ghost w-full py-2.5 text-xs"
          >
            Enregistrer l&apos;adresse
          </button>
        </div>
      )}

      {loading && <p className="text-text-3 text-sm text-center py-8">Chargement...</p>}

      {!loading && orders.length === 0 && (
        <div className="ui-card p-8 text-center">
          <p className="text-4xl mb-3">📦</p>
          <p className="font-bold">Aucune commande</p>
        </div>
      )}

      <div className="space-y-3">
        {orders.map((o) => (
          <div key={o.id} className="ui-card p-4">
            <div className="flex gap-3">
              {o.auction_image_url && (
                <img src={o.auction_image_url} alt="" className="w-14 h-14 rounded-xl object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate">{o.auction_title ?? 'Enchère'}</p>
                <p className="text-accent font-extrabold">{centsToEuros(o.amount_cents)} €</p>
                <p className="text-[10px] text-text-3 mt-1">
                  {STATUS_LABEL[o.status]} · {mode === 'buyer' ? o.counterparty_name : o.counterparty_name}
                </p>
              </div>
            </div>

            {mode === 'buyer' && o.status === 'pending_address' && (
              <button type="button" onClick={() => run(() => submitOrderAddress(o.id))} className="btn-accent w-full py-2.5 text-xs mt-3">
                Valider mon adresse pour cette commande
              </button>
            )}

            {mode === 'buyer' && o.status === 'shipped' && (
              <button type="button" onClick={() => run(() => confirmOrderDelivered(o.id))} className="btn-buyer w-full py-2.5 text-xs mt-3 flex items-center justify-center gap-1">
                <Check className="w-3.5 h-3.5" /> Confirmer réception
              </button>
            )}

            {mode === 'seller' && o.status === 'awaiting_shipment' && o.shipping_line1 && (
              <div className="mt-3 text-xs text-text-2 bg-white/5 rounded-xl p-3">
                <p className="font-bold text-text">{o.shipping_full_name}</p>
                <p>{o.shipping_line1}</p>
                {o.shipping_line2 && <p>{o.shipping_line2}</p>}
                <p>{o.shipping_postal_code} {o.shipping_city}</p>
              </div>
            )}

            {mode === 'seller' && ['awaiting_shipment', 'pending_address'].includes(o.status) && (
              <div className="mt-3 space-y-2">
                <input
                  placeholder="N° de suivi (optionnel)"
                  value={tracking[o.id] ?? ''}
                  onChange={(e) => setTracking((t) => ({ ...t, [o.id]: e.target.value }))}
                  className="search-bar w-full px-3 py-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => run(() => markOrderShipped(o.id, tracking[o.id]))}
                  className="btn-accent w-full py-2.5 text-xs flex items-center justify-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" /> Marquer expédié
                </button>
              </div>
            )}

            {o.tracking_number && (
              <p className="text-[10px] text-accent mt-2">Suivi : {o.tracking_number}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}