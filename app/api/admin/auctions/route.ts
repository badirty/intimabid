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
    const { data: auctions, error } = await admin
      .from('auctions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const sellerIds = [...new Set((auctions ?? []).map((a) => a.seller_id).filter(Boolean))];
    let profiles: { id: string; display_name: string | null }[] = [];
    if (sellerIds.length > 0) {
      const { data, error: profilesError } = await admin
        .from('profiles')
        .select('id, display_name')
        .in('id', sellerIds);
      if (profilesError) {
        return NextResponse.json({ error: profilesError.message }, { status: 500 });
      }
      profiles = data ?? [];
    }

    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();
    if (authError) {
      return NextResponse.json({ error: `auth.listUsers: ${authError.message}` }, { status: 500 });
    }

    const profileMap = new Map<string, string>();
    if (profiles) {
      for (const p of profiles) {
        if (p.display_name) profileMap.set(p.id, p.display_name);
      }
    }

    const emailMap = new Map<string, string>();
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        if (u.email) emailMap.set(u.id, u.email);
      }
    }

    const mapped = (auctions ?? []).map((a) => ({
      id: a.id,
      seller_id: a.seller_id,
      seller_email: emailMap.get(a.seller_id) ?? null,
      seller_name: profileMap.get(a.seller_id) ?? null,
      title: a.title,
      status: a.status,
      current_price_cents: a.current_price_cents,
      created_at: a.created_at,
    }));

    return NextResponse.json(mapped);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
