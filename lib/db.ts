import { supabase } from '@/lib/supabase';
import { isDemoWalletEnabled, signupBonusCents } from '@/lib/env';
import type { Auction, Notification, UserStats, Wallet } from '@/lib/types';
import { durationDaysToEndsAt, eurosToCents } from '@/lib/format';

export async function ensureUserBootstrap(userId: string, email?: string) {
  const name = email?.split('@')[0] ?? 'user';
  await supabase.from('profiles').upsert({ id: userId, display_name: name }, { onConflict: 'id' });
  const { data: w } = await supabase.from('wallets').select('user_id').eq('user_id', userId).maybeSingle();
  if (!w) {
    await supabase.from('wallets').insert({ user_id: userId, balance_cents: signupBonusCents() });
  }
}

export async function closeExpiredAuctions() {
  await supabase.rpc('close_expired_auctions');
}

export async function fetchLiveAuctions(userId?: string, search = ''): Promise<Auction[]> {
  await closeExpiredAuctions();
  let q = supabase
    .from('auctions')
    .select('*')
    .eq('status', 'live')
    .gt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: true });

  if (search.trim()) q = q.ilike('title', `%${search.trim()}%`);

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  const auctions = await enrichAuctions(data ?? [], userId);
  return auctions;
}

export async function fetchEndedAuctions(search = ''): Promise<Auction[]> {
  let q = supabase
    .from('auctions')
    .select('*')
    .in('status', ['ended', 'sold'])
    .order('ends_at', { ascending: false })
    .limit(20);

  if (search.trim()) q = q.ilike('title', `%${search.trim()}%`);

  const { data, error } = await q;
  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return enrichAuctions(data ?? []);
}

export async function fetchFavorites(userId: string): Promise<Auction[]> {
  const { data, error } = await supabase
    .from('favorites')
    .select('auction_id, auctions(*)')
    .eq('user_id', userId);

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  const rows = (data ?? [])
    .map((f) => f.auctions as unknown as Record<string, unknown> | null)
    .filter((a): a is Record<string, unknown> => a != null);
  return enrichAuctions(rows, userId);
}

async function enrichAuctions(rows: Record<string, unknown>[], userId?: string): Promise<Auction[]> {
  const ids = rows.map((r) => r.id as string);
  const sellerIds = [...new Set(rows.map((r) => r.seller_id as string))];
  const sellerNames: Record<string, string> = {};

  if (sellerIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name').in('id', sellerIds);
    for (const p of profiles ?? []) sellerNames[p.id] = p.display_name ?? 'Vendeur';
  }

  let favSet = new Set<string>();
  let bidCounts: Record<string, number> = {};

  if (userId && ids.length) {
    const { data: favs } = await supabase.from('favorites').select('auction_id').eq('user_id', userId).in('auction_id', ids);
    favSet = new Set((favs ?? []).map((f) => f.auction_id));

    const { data: bids } = await supabase.from('bids').select('auction_id').in('auction_id', ids);
    for (const b of bids ?? []) {
      bidCounts[b.auction_id] = (bidCounts[b.auction_id] ?? 0) + 1;
    }
  }

  return rows.map((r) => ({
    ...mapAuctionRow(r, sellerNames[r.seller_id as string]),
    is_favorite: favSet.has(r.id as string),
    bid_count: bidCounts[r.id as string] ?? 0,
  }));
}

function mapAuctionRow(row: Record<string, unknown>, sellerName?: string): Auction {
  return {
    id: row.id as string,
    seller_id: row.seller_id as string,
    title: row.title as string,
    description: (row.description as string) ?? null,
    start_price_cents: row.start_price_cents as number,
    current_price_cents: row.current_price_cents as number,
    bid_increment_cents: row.bid_increment_cents as number,
    status: row.status as Auction['status'],
    ends_at: row.ends_at as string,
    image_color: row.image_color as string,
    image_url: (row.image_url as string) ?? null,
    buy_now_price_cents: (row.buy_now_price_cents as number) ?? null,
    winner_id: (row.winner_id as string) ?? null,
    created_at: row.created_at as string,
    seller_name: sellerName ?? 'Vendeur',
  };
}

export async function toggleFavorite(userId: string, auctionId: string, isFavorite: boolean) {
  if (isFavorite) {
    await supabase.from('favorites').delete().eq('user_id', userId).eq('auction_id', auctionId);
  } else {
    await supabase.from('favorites').insert({ user_id: userId, auction_id: auctionId });
  }
}

export async function placeBid(auctionId: string, amountCents: number) {
  const { data, error } = await supabase.rpc('place_bid', {
    p_auction_id: auctionId,
    p_amount_cents: amountCents,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createAuction(
  sellerId: string,
  title: string,
  startPriceCents: number,
  durationDays: number,
  imageColor: string,
  imageUrl?: string | null,
  buyNowPriceCents?: number | null,
  description?: string | null,
) {
  const endsAt = durationDaysToEndsAt(durationDays);
  const { data, error } = await supabase
    .from('auctions')
    .insert({
      seller_id: sellerId,
      title,
      description: description?.trim() || null,
      start_price_cents: startPriceCents,
      current_price_cents: startPriceCents,
      ends_at: endsAt,
      image_color: imageColor,
      image_url: imageUrl ?? null,
      buy_now_price_cents: buyNowPriceCents ?? null,
      status: 'live',
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function uploadAuctionImage(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('auction-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    if (error.message?.includes('Bucket') || error.message?.includes('not found')) {
      throw new Error('Stockage non configuré. Exécute supabase/migrations/005_storage_images.sql dans Supabase.');
    }
    throw new Error(error.message);
  }

  const { data: publicUrl } = supabase.storage
    .from('auction-images')
    .getPublicUrl(fileName);

  return publicUrl.publicUrl;
}

export async function fetchSellerAuctions(sellerId: string) {
  const { data, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('seller_id', sellerId)
    .order('created_at', { ascending: false });

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  const rows = data ?? [];
  const ids = rows.map((r) => r.id);
  const bidCounts: Record<string, number> = {};
  if (ids.length) {
    const { data: bids } = await supabase.from('bids').select('auction_id').in('auction_id', ids);
    for (const b of bids ?? []) bidCounts[b.auction_id] = (bidCounts[b.auction_id] ?? 0) + 1;
  }

  return rows.map((r) => ({ ...r, bid_count: bidCounts[r.id] ?? 0 }));
}

export async function fetchWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabase.from('wallets').select('*').eq('user_id', userId).maybeSingle();
  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }
  return data;
}

export async function isDbReady(): Promise<boolean> {
  const { error } = await supabase.from('wallets').select('user_id').limit(1);
  return !error || error.code !== '42P01';
}

export async function demoTopup(amountCents = 5000, userId?: string) {
  if (!isDemoWalletEnabled()) {
    throw new Error('Recharge démo désactivée. Utilise le paiement par carte.');
  }
  const uid = userId ?? (await supabase.auth.getUser()).data.user?.id;
  if (!uid) throw new Error('Non connecté');

  const before = (await fetchWallet(uid))?.balance_cents ?? 0;
  const { error } = await supabase.rpc('demo_wallet_topup', { p_amount_cents: amountCents });
  if (!error) {
    const after = (await fetchWallet(uid))?.balance_cents ?? 0;
    if (after > before) return;
  }

  await ensureUserBootstrap(uid);
  const wallet = await fetchWallet(uid);
  const newBalance = (wallet?.balance_cents ?? 0) + amountCents;

  const { error: upErr } = await supabase
    .from('wallets')
    .upsert({ user_id: uid, balance_cents: newBalance, pending_cents: wallet?.pending_cents ?? 0 });

  if (upErr) {
    if (upErr.code === '42P01') {
      throw new Error('Base de données non configurée. Exécute supabase/migrations/001_schema.sql dans Supabase.');
    }
    throw new Error(upErr.message);
  }

  await supabase.from('wallet_transactions').insert({
    user_id: uid,
    type: 'topup_demo',
    amount_cents: amountCents,
    description: 'Recharge démo',
  }).then(() => {});
}

export async function creditWallet(userId: string, amountCents: number, type: 'topup_stripe' | 'topup_demo' = 'topup_stripe') {
  await ensureUserBootstrap(userId);
  const wallet = await fetchWallet(userId);
  const newBalance = (wallet?.balance_cents ?? 0) + amountCents;
  await supabase.from('wallets').upsert({
    user_id: userId,
    balance_cents: newBalance,
    pending_cents: wallet?.pending_cents ?? 0,
  });
  await supabase.from('wallet_transactions').insert({
    user_id: userId,
    type,
    amount_cents: amountCents,
    description: type === 'topup_stripe' ? 'Recharge Stripe' : 'Recharge démo',
  });
}

export async function requestWithdrawal(amountCents: number) {
  const { error } = await supabase.rpc('request_withdrawal', { p_amount_cents: amountCents });
  if (error) throw new Error(error.message);
}

export async function fetchNotifications(userId: string): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return data ?? [];
}

export async function markNotificationRead(id: string) {
  await supabase.from('notifications').update({ read: true }).eq('id', id);
}

export async function markAllNotificationsRead(userId: string) {
  await supabase.from('notifications').update({ read: true }).eq('user_id', userId).eq('read', false);
}

export async function fetchUserStats(userId: string): Promise<UserStats> {
  const [wallet, bids, sales] = await Promise.all([
    fetchWallet(userId),
    supabase.from('bids').select('id', { count: 'exact', head: true }).eq('bidder_id', userId),
    supabase.from('auctions').select('id', { count: 'exact', head: true }).eq('seller_id', userId),
  ]);

  return {
    bids_count: bids.count ?? 0,
    sales_count: sales.count ?? 0,
    balance_cents: wallet?.balance_cents ?? 0,
  };
}

export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('read', false);

  if (error) return 0;
  return count ?? 0;
}

export async function fetchAuctionById(auctionId: string): Promise<Auction | null> {
  const { data, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .maybeSingle();

  if (error || !data) return null;
  return mapAuctionRow(data as Record<string, unknown>);
}

export async function fetchBidHistory(auctionId: string): Promise<{ bidder_name: string; amount_cents: number; created_at: string }[]> {
  const { data, error } = await supabase
    .from('bids')
    .select('amount_cents, created_at, bidder_id, profiles(display_name)')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  return (data ?? []).map((b: Record<string, unknown>) => ({
    bidder_name: ((b.profiles as Record<string, unknown> | null)?.display_name as string) ?? 'Anonyme',
    amount_cents: b.amount_cents as number,
    created_at: b.created_at as string,
  }));
}

export { eurosToCents };