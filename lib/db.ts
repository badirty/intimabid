import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { signupBonusCents } from '@/lib/env';
import { resolveProfileFromUser } from '@/lib/profile';
import type {
  Auction, MessageCode, Notification, Order, OrderMessage, Profile, SellerSearchResult, UserAddress, UserStats, Wallet, WalletTransaction,
} from '@/lib/types';
import { durationDaysToEndsAt, durationHoursToEndsAt, eurosToCents } from '@/lib/format';

export async function ensureUserBootstrap(userId: string, email?: string, user?: User | null) {
  const resolved = user
    ? resolveProfileFromUser(user)
    : { display_name: email?.split('@')[0] ?? 'user', avatar_url: null as string | null, bio: null as string | null, x_username: null as string | null };
  const { data: existing } = await supabase
    .from('profiles')
    .select('display_name, avatar_url, bio, x_username')
    .eq('id', userId)
    .maybeSingle();

  await supabase.from('profiles').upsert(
    {
      id: userId,
      display_name: existing?.display_name ?? resolved.display_name,
      avatar_url: resolved.avatar_url ?? existing?.avatar_url ?? null,
      bio: existing?.bio ?? resolved.bio ?? null,
      x_username: existing?.x_username ?? resolved.x_username ?? null,
    },
    { onConflict: 'id' },
  );
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

export async function searchSellers(query: string): Promise<SellerSearchResult[]> {
  const q = query.trim();
  if (!q) return [];

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .ilike('display_name', `%${q}%`)
    .limit(20);

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  if (!profiles?.length) return [];

  const ids = profiles.map((p) => p.id);
  const { data: auctions } = await supabase
    .from('auctions')
    .select('seller_id, status')
    .in('seller_id', ids);

  const liveCount: Record<string, number> = {};
  const salesCount: Record<string, number> = {};
  for (const a of auctions ?? []) {
    if (a.status === 'live') liveCount[a.seller_id] = (liveCount[a.seller_id] ?? 0) + 1;
    if (a.status === 'sold') salesCount[a.seller_id] = (salesCount[a.seller_id] ?? 0) + 1;
  }

  return profiles
    .map((p) => ({
      id: p.id,
      display_name: p.display_name ?? 'Vendeur',
      live_count: liveCount[p.id] ?? 0,
      total_sales: salesCount[p.id] ?? 0,
      avatar_url: (p as { avatar_url?: string | null }).avatar_url ?? null,
    }))
    .sort((a, b) => b.live_count - a.live_count || a.display_name.localeCompare(b.display_name));
}

export async function fetchLiveAuctionsBySeller(sellerId: string, userId?: string): Promise<Auction[]> {
  await closeExpiredAuctions();
  const { data, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('seller_id', sellerId)
    .eq('status', 'live')
    .gt('ends_at', new Date().toISOString())
    .order('ends_at', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return enrichAuctions(data ?? [], userId);
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

  const sellerAvatars: Record<string, string | null> = {};
  if (sellerIds.length) {
    const { data: profiles } = await supabase.from('profiles').select('id, display_name, avatar_url').in('id', sellerIds);
    for (const p of profiles ?? []) {
      sellerNames[p.id] = p.display_name ?? 'Vendeur';
      sellerAvatars[p.id] = p.avatar_url ?? null;
    }
  }

  let favSet = new Set<string>();
  const bidCounts: Record<string, number> = {};

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
    seller_avatar_url: sellerAvatars[r.seller_id as string] ?? null,
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
  sendTransactionalEvent('outbid', { auctionId, outbidAmountCents: amountCents });
  return data;
}

export async function buyNow(auctionId: string) {
  const { data, error } = await supabase.rpc('buy_now', { p_auction_id: auctionId });
  if (error) throw new Error(error.message);
  sendTransactionalEvent('won_auction', { auctionId });
  sendTransactionalEvent('seller_sale', { auctionId });
  return data;
}

/** Fire-and-forget : déclenche un email transactionnel sans bloquer l'UI. */
async function sendTransactionalEvent(
  event: 'outbid' | 'won_auction' | 'seller_sale',
  params: Record<string, unknown>,
) {
  try {
    fetch('/api/email/transactional', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, ...params }),
    }).catch(() => {});
  } catch { /* silencieux */ }
}

export async function fetchTopSellers(limit = 6): Promise<SellerSearchResult[]> {
  await closeExpiredAuctions();
  const { data: auctions, error } = await supabase
    .from('auctions')
    .select('seller_id, status')
    .in('status', ['live', 'sold']);

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  const liveCount: Record<string, number> = {};
  const salesCount: Record<string, number> = {};
  for (const a of auctions ?? []) {
    if (a.status === 'live') liveCount[a.seller_id] = (liveCount[a.seller_id] ?? 0) + 1;
    if (a.status === 'sold') salesCount[a.seller_id] = (salesCount[a.seller_id] ?? 0) + 1;
  }

  const ids = Object.keys(liveCount).sort((a, b) => liveCount[b] - liveCount[a]).slice(0, limit);
  if (!ids.length) return [];

  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url')
    .in('id', ids);

  return (profiles ?? [])
    .map((p) => ({
      id: p.id,
      display_name: p.display_name ?? 'Vendeur',
      live_count: liveCount[p.id] ?? 0,
      total_sales: salesCount[p.id] ?? 0,
      avatar_url: p.avatar_url ?? null,
    }))
    .sort((a, b) => b.live_count - a.live_count);
}

export async function createAuction(
  sellerId: string,
  title: string,
  startPriceCents: number,
  durationHours: number,
  imageUrl: string,
  buyNowPriceCents?: number | null,
  description?: string | null,
) {
  const endsAt = durationHoursToEndsAt(durationHours);
  const { data, error } = await supabase
    .from('auctions')
    .insert({
      seller_id: sellerId,
      title,
      description: description?.trim() || null,
      start_price_cents: startPriceCents,
      current_price_cents: startPriceCents,
      ends_at: endsAt,
      image_color: 'from-violet-300 via-purple-200 to-fuchsia-200',
      image_url: imageUrl,
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

  return enrichAuctions((data ?? []) as Record<string, unknown>[], sellerId);
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

async function authFetch(path: string, init?: RequestInit) {
  const { data: { session } } = await supabase.auth.getSession();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string>),
  };
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;
  return fetch(path, { ...init, headers });
}

/** Retrait automatique vers compte bancaire (Stripe Connect). */
export async function withdrawToBank(amountCents: number): Promise<{ message?: string }> {
  const res = await authFetch('/api/stripe/withdraw', {
    method: 'POST',
    body: JSON.stringify({ amount_cents: amountCents }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erreur retrait');
  return data;
}

/** Annule un retrait bloqué en « en attente » et recrédite le portefeuille. */
export async function cancelPendingWithdrawal(): Promise<number> {
  const res = await authFetch('/api/stripe/withdraw/cancel', { method: 'POST' });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? 'Erreur annulation');
  return data.cancelled_cents ?? 0;
}

/** @deprecated Utiliser withdrawToBank */
export async function requestWithdrawal(amountCents: number) {
  await withdrawToBank(amountCents);
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

export async function fetchAuctionById(auctionId: string, userId?: string): Promise<Auction | null> {
  const { data, error } = await supabase
    .from('auctions')
    .select('*')
    .eq('id', auctionId)
    .maybeSingle();

  if (error || !data) return null;
  const [enriched] = await enrichAuctions([data as Record<string, unknown>], userId);
  return enriched ?? null;
}

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, display_name, avatar_url, bio, bio_public, x_username, x_public, created_at')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }
  return data;
}

export async function updateDisplayName(userId: string, displayName: string) {
  const name = displayName.trim();
  if (!name || name.length < 2) throw new Error('Pseudo minimum 2 caractères');
  if (name.length > 32) throw new Error('Pseudo maximum 32 caractères');

  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, display_name: name }, { onConflict: 'id' });

  if (error) throw new Error(error.message);
}

export async function updateProfileSettings(
  userId: string,
  patch: { bio?: string; bio_public?: boolean; x_username?: string; x_public?: boolean },
) {
  const row: Record<string, unknown> = { id: userId };
  if (patch.bio !== undefined) {
    const bio = patch.bio.trim();
    if (bio.length > 160) throw new Error('Bio maximum 160 caractères');
    row.bio = bio || null;
  }
  if (patch.bio_public !== undefined) row.bio_public = patch.bio_public;
  if (patch.x_username !== undefined) {
    const xu = patch.x_username.trim().replace(/^@+/, '');
    if (xu.length > 30) throw new Error('Nom X maximum 30 caractères');
    row.x_username = xu || null;
  }
  if (patch.x_public !== undefined) row.x_public = patch.x_public;

  const { error } = await supabase.from('profiles').upsert(row, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function fetchWalletTransactions(userId: string, limit = 30): Promise<WalletTransaction[]> {
  const { data, error } = await supabase
    .from('wallet_transactions')
    .select('id, type, amount_cents, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return data ?? [];
}

export async function fetchSellerStats(userId: string, viewerId?: string) {
  const { data: auctions } = await supabase
    .from('auctions')
    .select('status')
    .eq('seller_id', userId);

  let live_count = 0;
  let total_sales = 0;
  for (const a of auctions ?? []) {
    if (a.status === 'live') live_count++;
    if (a.status === 'sold') total_sales++;
  }

  const profile = await fetchProfile(userId);
  const isOwner = viewerId === userId;
  const showBio = isOwner || !!profile?.bio_public;
  const showX = isOwner || !!profile?.x_public;
  return {
    id: userId,
    display_name: profile?.display_name ?? 'Vendeur',
    avatar_url: profile?.avatar_url ?? null,
    bio: showBio ? profile?.bio ?? null : null,
    x_username: showX ? profile?.x_username ?? null : null,
    live_count,
    total_sales,
  } satisfies SellerSearchResult;
}

export async function fetchBidHistory(auctionId: string): Promise<{
  bidder_id: string;
  bidder_name: string;
  bidder_avatar_url: string | null;
  amount_cents: number;
  created_at: string;
}[]> {
  const { data, error } = await supabase
    .from('bids')
    .select('amount_cents, created_at, bidder_id, profiles(display_name, avatar_url)')
    .eq('auction_id', auctionId)
    .order('created_at', { ascending: false })
    .limit(30);

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }

  return (data ?? []).map((b: Record<string, unknown>) => {
    const profile = b.profiles as Record<string, unknown> | null;
    return {
      bidder_id: b.bidder_id as string,
      bidder_name: (profile?.display_name as string) ?? 'Anonyme',
      bidder_avatar_url: (profile?.avatar_url as string | null) ?? null,
      amount_cents: b.amount_cents as number,
      created_at: b.created_at as string,
    };
  });
}

export async function confirmAge(userId: string) {
  await supabase.from('profiles').upsert(
    { id: userId, age_confirmed_at: new Date().toISOString() },
    { onConflict: 'id' },
  );
}

export async function hasConfirmedAge(userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('age_confirmed_at').eq('id', userId).maybeSingle();
  return !!data?.age_confirmed_at;
}

export async function isUserSuspended(userId: string): Promise<boolean> {
  const { data } = await supabase.from('profiles').select('suspended_at').eq('id', userId).maybeSingle();
  return !!data?.suspended_at;
}

export async function submitReport(auctionId: string | null, reason: string, details?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');
  const { error } = await supabase.from('reports').insert({
    reporter_id: user.id,
    auction_id: auctionId,
    reason,
    details: details?.trim() || null,
  });
  if (error) throw new Error(error.message);
}

async function enrichOrders(rows: Record<string, unknown>[], userId: string): Promise<Order[]> {
  const auctionIds = rows.map((r) => r.auction_id as string);
  const { data: auctions } = auctionIds.length
    ? await supabase.from('auctions').select('id, title, image_url').in('id', auctionIds)
    : { data: [] };
  const auctionMap = Object.fromEntries((auctions ?? []).map((a) => [a.id, a]));

  const otherIds = rows.map((r) => (r.buyer_id === userId ? r.seller_id : r.buyer_id) as string);
  const { data: profiles } = otherIds.length
    ? await supabase.from('profiles').select('id, display_name').in('id', [...new Set(otherIds)])
    : { data: [] };
  const nameMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.display_name ?? 'Utilisateur']));

  return rows.map((r) => {
    const a = auctionMap[r.auction_id as string];
    const otherId = r.buyer_id === userId ? r.seller_id : r.buyer_id;
    return {
      ...(r as unknown as Order),
      auction_title: a?.title,
      auction_image_url: a?.image_url ?? null,
      counterparty_name: nameMap[otherId as string],
    };
  });
}

export async function fetchBuyerOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').eq('buyer_id', userId).order('created_at', { ascending: false });
  if (error) { if (error.code === '42P01') return []; throw error; }
  return enrichOrders((data ?? []) as Record<string, unknown>[], userId);
}

export async function fetchSellerOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase.from('orders').select('*').eq('seller_id', userId).order('created_at', { ascending: false });
  if (error) { if (error.code === '42P01') return []; throw error; }
  return enrichOrders((data ?? []) as Record<string, unknown>[], userId);
}

export async function fetchUserAddress(userId: string): Promise<UserAddress | null> {
  const { data, error } = await supabase.from('user_addresses').select('*').eq('user_id', userId).maybeSingle();
  if (error) { if (error.code === '42P01') return null; throw error; }
  return data;
}

export async function saveShippingAddress(addr: Omit<UserAddress, 'user_id'>) {
  const { error } = await supabase.rpc('save_shipping_address', {
    p_full_name: addr.full_name,
    p_line1: addr.line1,
    p_line2: addr.line2 ?? '',
    p_city: addr.city,
    p_postal: addr.postal_code,
    p_country: addr.country,
  });
  if (error) throw new Error(error.message);
}

export async function submitOrderAddress(orderId: string) {
  const { error } = await supabase.rpc('submit_order_address', { p_order_id: orderId });
  if (error) throw new Error(error.message);
}

export async function markOrderShipped(orderId: string, tracking?: string) {
  const { error } = await supabase.rpc('mark_order_shipped', { p_order_id: orderId, p_tracking: tracking ?? '' });
  if (error) throw new Error(error.message);
  try {
    fetch('/api/email/transactional', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event: 'order_shipped', orderId, trackingNumber: tracking }),
    }).catch(() => {});
  } catch { /* silencieux */ }
}

export async function confirmOrderDelivered(orderId: string) {
  const { error } = await supabase.rpc('confirm_order_delivered', { p_order_id: orderId });
  if (error) throw new Error(error.message);
}

export async function cancelAuction(auctionId: string) {
  const { error } = await supabase.rpc('cancel_auction', { p_auction_id: auctionId });
  if (error) throw new Error(error.message);
}

export async function extendAuction(auctionId: string, extraHours = 1) {
  const { error } = await supabase.rpc('extend_auction', { p_auction_id: auctionId, p_extra_hours: extraHours });
  if (error) throw new Error(error.message);
}

export async function editAuction(auctionId: string, title?: string, description?: string) {
  const { error } = await supabase.rpc('edit_auction', {
    p_auction_id: auctionId,
    p_title: title ?? null,
    p_description: description ?? null,
  });
  if (error) throw new Error(error.message);
}

export async function fetchMyActiveBidAuctions(userId: string): Promise<Auction[]> {
  const { data: bids } = await supabase.from('bids').select('auction_id').eq('bidder_id', userId);
  const ids = [...new Set((bids ?? []).map((b) => b.auction_id))];
  if (!ids.length) return [];
  const { data } = await supabase.from('auctions').select('*').in('id', ids).eq('status', 'live').gt('ends_at', new Date().toISOString());
  return enrichAuctions((data ?? []) as Record<string, unknown>[], userId);
}

export async function fetchMyWonAuctions(userId: string): Promise<Auction[]> {
  const { data } = await supabase.from('auctions').select('*').eq('winner_id', userId).eq('status', 'sold').order('ends_at', { ascending: false }).limit(30);
  return enrichAuctions((data ?? []) as Record<string, unknown>[], userId);
}

export async function fetchMyLostAuctions(userId: string): Promise<Auction[]> {
  const { data: bids } = await supabase.from('bids').select('auction_id').eq('bidder_id', userId);
  const ids = [...new Set((bids ?? []).map((b) => b.auction_id))];
  if (!ids.length) return [];
  const { data } = await supabase
    .from('auctions')
    .select('*')
    .in('id', ids)
    .in('status', ['sold', 'ended'])
    .neq('winner_id', userId);
  return enrichAuctions((data ?? []) as Record<string, unknown>[], userId);
}

export async function fetchProfileById(userId: string, viewerId?: string): Promise<SellerSearchResult | null> {
  return fetchSellerStats(userId, viewerId);
}

export { eurosToCents };

// ─── Chat post-enchère (messages prédéfinis) ───

export async function fetchOrderByAuctionId(auctionId: string, userId?: string): Promise<Order | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('auction_id', auctionId)
    .maybeSingle();

  if (error) {
    if (error.code === '42P01') return null;
    throw error;
  }
  if (!data) return null;

  // Enrichir avec le nom de la contrepartie
  const uid = userId ?? data.buyer_id;
  const otherId = data.buyer_id === uid ? data.seller_id : data.buyer_id;
  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('id', otherId)
    .maybeSingle();

  return {
    ...(data as unknown as Order),
    counterparty_name: profile?.display_name ?? 'Utilisateur',
  };
}

export async function fetchOrderMessages(orderId: string): Promise<OrderMessage[]> {
  const { data, error } = await supabase
    .from('order_messages')
    .select('*')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) {
    if (error.code === '42P01') return [];
    throw error;
  }
  return data ?? [];
}

export async function sendOrderMessage(orderId: string, messageCode: MessageCode) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Non connecté');

  const { error } = await supabase
    .from('order_messages')
    .insert({
      order_id: orderId,
      sender_id: user.id,
      message_code: messageCode,
    });

  if (error) throw new Error(error.message);
}

/** Retourne les codes messages disponibles selon le rôle et le statut de la commande */
export function getAvailableMessageCodes(role: 'buyer' | 'seller', orderStatus: string): MessageCode[] {
  const all: Record<string, MessageCode[]> = {
    buyer: ['BUYER_ISSUE'],
    seller: ['SELLER_THANKS'],
  };

  // pending_address / awaiting_shipment : l'acheteur peut demander quand ça part
  if (orderStatus === 'pending_address' || orderStatus === 'awaiting_shipment') {
    all.buyer.push('BUYER_WHEN_SHIP');
  }
  // awaiting_shipment / shipped : l'acheteur peut demander le suivi
  if (orderStatus === 'awaiting_shipment' || orderStatus === 'shipped') {
    all.buyer.push('BUYER_TRACKING');
  }
  // shipped : l'acheteur peut confirmer réception
  if (orderStatus === 'shipped') {
    all.buyer.push('BUYER_RECEIVED');
  }
  // pending_address / awaiting_shipment : le vendeur peut dire qu'il prépare
  if (orderStatus === 'pending_address' || orderStatus === 'awaiting_shipment') {
    all.seller.push('SELLER_PREPARING');
  }
  // awaiting_shipment : le vendeur peut dire qu'il a expédié
  if (orderStatus === 'awaiting_shipment') {
    all.seller.push('SELLER_SHIPPED');
  }
  // shipped : le vendeur peut demander si reçu
  if (orderStatus === 'shipped') {
    all.seller.push('SELLER_ASK_RECEIVED');
  }

  return all[role] ?? [];
}

/** Traduit un code message en texte affiché */
export function getMessageLabel(code: MessageCode): string {
  const labels: Record<MessageCode, string> = {
    BUYER_WHEN_SHIP: 'Quand penses-tu expédier la commande ?',
    BUYER_TRACKING: 'Peux-tu me donner le numéro de suivi ?',
    BUYER_RECEIVED: "J'ai bien reçu le colis, merci !",
    BUYER_ISSUE: "J'ai un souci avec la réception de ma commande.",
    SELLER_THANKS: 'Merci pour ton achat !',
    SELLER_PREPARING: 'Je prépare ton colis.',
    SELLER_SHIPPED: "Le colis a été expédié aujourd'hui.",
    SELLER_ASK_RECEIVED: 'As-tu bien reçu le colis ?',
  };
  return labels[code];
}