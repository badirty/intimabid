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
  const { data: profiles, error } = await admin
    .from('profiles')
    .select('*, wallets(balance_cents)')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch emails from auth.users via service role
  const userIds = (profiles ?? []).map((p) => p.id);
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (!authError && authUsers?.users) {
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
    balance_cents: (p.wallets as { balance_cents?: number } | null)?.balance_cents ?? 0,
  }));

  return NextResponse.json(mapped);
}
