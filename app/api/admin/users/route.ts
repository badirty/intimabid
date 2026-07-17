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
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const userIds = [...new Set((profiles ?? []).map((p) => p.id).filter(Boolean))];
    let wallets: { user_id: string; balance_cents: number }[] = [];
    if (userIds.length > 0) {
      const { data, error: walletsError } = await admin
        .from('wallets')
        .select('user_id, balance_cents')
        .in('user_id', userIds);
      if (walletsError) {
        return NextResponse.json({ error: walletsError.message }, { status: 500 });
      }
      wallets = data ?? [];
    }

    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();
    if (authError) {
      return NextResponse.json({ error: `auth.listUsers: ${authError.message}` }, { status: 500 });
    }

    const walletMap = new Map<string, number>();
    if (wallets) {
      for (const w of wallets) {
        walletMap.set(w.user_id, w.balance_cents ?? 0);
      }
    }

    const emailMap = new Map<string, string>();
    if (authUsers?.users) {
      for (const u of authUsers.users) {
        if (u.email) emailMap.set(u.id, u.email);
      }
    }

    const mapped = (profiles ?? []).map((p) => ({
      id: p.id,
      email: emailMap.get(p.id) ?? null,
      display_name: p.display_name,
      created_at: p.created_at,
      suspended_at: p.suspended_at,
      balance_cents: walletMap.get(p.id) ?? 0,
    }));

    return NextResponse.json(mapped);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
