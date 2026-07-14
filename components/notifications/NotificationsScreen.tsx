'use client';

import { useCallback, useEffect, useState } from 'react';
import type { Notification } from '@/lib/types';
import { fetchNotifications, markAllNotificationsRead, markNotificationRead } from '@/lib/db';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function NotificationsScreen({
  userId,
  onOpenAuction,
}: {
  userId: string;
  onOpenAuction?: (auctionId: string) => void;
}) {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await fetchNotifications(userId));
    setLoading(false);
  }, [userId]);

  useEffect(() => { load(); }, [load]);

  const handleTap = async (n: Notification) => {
    if (!n.read) await markNotificationRead(n.id);
    if (n.auction_id && onOpenAuction) {
      onOpenAuction(n.auction_id);
      return;
    }
    await load();
  };

  const markAll = async () => {
    await markAllNotificationsRead(userId);
    await load();
  };

  return (
    <div className="animate-slide-up px-4 py-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold" style={{ fontFamily: 'var(--font-display)' }}>Notifications</h1>
        {items.some((n) => !n.read) && (
          <button onClick={markAll} className="text-buyer text-xs font-bold">Tout lire</button>
        )}
      </div>

      {loading && <p className="text-text-3 text-sm text-center py-8">Chargement...</p>}

      {!loading && items.length === 0 && (
        <div className="ui-card p-8 text-center">
          <p className="text-4xl mb-3">🔔</p>
          <p className="font-bold">Aucune notification</p>
          <p className="text-text-3 text-sm mt-2">Tu seras alerté des nouvelles offres</p>
        </div>
      )}

      <div className="space-y-2">
        {items.map((n) => (
          <button
            key={n.id}
            onClick={() => handleTap(n)}
            className={`ui-card w-full p-4 text-left transition-colors hover:border-accent/30 ${
              !n.read ? 'ring-2 ring-buyer/20' : ''
            }`}
          >
            <div className="flex justify-between gap-2">
              <p className="font-bold text-sm text-text">{n.title}</p>
              {!n.read && <span className="w-2 h-2 rounded-full bg-buyer shrink-0 mt-1.5" />}
            </div>
            {n.body && <p className="text-text-2 text-xs mt-1">{n.body}</p>}
            <p className="text-text-3 text-[10px] mt-2">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
              {n.auction_id && ' · Voir l\'enchère →'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}