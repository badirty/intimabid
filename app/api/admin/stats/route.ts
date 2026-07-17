import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/admin';
import { isAdminEmail } from '@/lib/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const admin = createAdminClient();

  const [
    { count: usersCount },
    { count: auctionsCount },
    { count: liveAuctionsCount },
    { count: soldAuctionsCount },
    { count: ordersCount },
    { count: pendingWithdrawalsCount },
    { count: reportsCount },
  ] = await Promise.all([
    admin.from('profiles').select('*', { count: 'exact', head: true }),
    admin.from('auctions').select('*', { count: 'exact', head: true }),
    admin.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'live'),
    admin.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
    admin.from('orders').select('*', { count: 'exact', head: true }),
    admin.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    admin.from('reports').select('*', { count: 'exact', head: true }),
  ]);

  return NextResponse.json({
    users_count: usersCount ?? 0,
    auctions_count: auctionsCount ?? 0,
    live_auctions_count: liveAuctionsCount ?? 0,
    sold_auctions_count: soldAuctionsCount ?? 0,
    orders_count: ordersCount ?? 0,
    pending_withdrawals_count: pendingWithdrawalsCount ?? 0,
    reports_count: reportsCount ?? 0,
  });
}
