import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isAdminEmail } from '@/lib/admin';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user || !isAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
    }

    const admin = createAdminClient();

    const [
      { count: usersCount, error: usersError },
      { count: auctionsCount, error: auctionsError },
      { count: liveAuctionsCount, error: liveAuctionsError },
      { count: soldAuctionsCount, error: soldAuctionsError },
      { count: ordersCount, error: ordersError },
      { count: pendingWithdrawalsCount, error: withdrawalsError },
      { count: reportsCount, error: reportsError },
    ] = await Promise.all([
      admin.from('profiles').select('*', { count: 'exact', head: true }),
      admin.from('auctions').select('*', { count: 'exact', head: true }),
      admin.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'live'),
      admin.from('auctions').select('*', { count: 'exact', head: true }).eq('status', 'sold'),
      admin.from('orders').select('*', { count: 'exact', head: true }),
      admin.from('withdrawal_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      admin.from('reports').select('*', { count: 'exact', head: true }),
    ]);

    const errors = [
      { name: 'profiles', error: usersError },
      { name: 'auctions', error: auctionsError },
      { name: 'auctions_live', error: liveAuctionsError },
      { name: 'auctions_sold', error: soldAuctionsError },
      { name: 'orders', error: ordersError },
      { name: 'withdrawal_requests', error: withdrawalsError },
      { name: 'reports', error: reportsError },
    ].filter((e) => !!e.error);

    if (errors.length > 0) {
      return NextResponse.json(
        { error: `Erreur Supabase : ${errors.map((e) => `${e.name}: ${e.error?.message}`).join(', ')}` },
        { status: 500 },
      );
    }

    return NextResponse.json({
      users_count: usersCount ?? 0,
      auctions_count: auctionsCount ?? 0,
      live_auctions_count: liveAuctionsCount ?? 0,
      sold_auctions_count: soldAuctionsCount ?? 0,
      orders_count: ordersCount ?? 0,
      pending_withdrawals_count: pendingWithdrawalsCount ?? 0,
      reports_count: reportsCount ?? 0,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
