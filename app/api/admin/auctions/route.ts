import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient, isAdminEmail } from '@/lib/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: auctions, error } = await admin
    .from('auctions')
    .select('*, seller:profiles!auctions_seller_id_fkey(display_name)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const sellerIds = [...new Set((auctions ?? []).map((a) => a.seller_id))];
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (!authError && authUsers?.users) {
    for (const u of authUsers.users) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  }

  const mapped = (auctions ?? []).map((a) => ({
    id: a.id,
    seller_id: a.seller_id,
    seller_email: emailMap.get(a.seller_id) ?? null,
    title: a.title,
    status: a.status,
    current_price_cents: a.current_price_cents,
    created_at: a.created_at,
  }));

  return NextResponse.json(mapped);
}
