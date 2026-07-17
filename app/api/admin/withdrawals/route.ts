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
  const { data: withdrawals, error } = await admin
    .from('withdrawal_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const userIds = [...new Set((withdrawals ?? []).map((w) => w.user_id))];
  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (!authError && authUsers?.users) {
    for (const u of authUsers.users) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  }

  const mapped = (withdrawals ?? []).map((w) => ({
    id: w.id,
    user_id: w.user_id,
    user_email: emailMap.get(w.user_id) ?? null,
    amount_cents: w.amount_cents,
    status: w.status,
    created_at: w.created_at,
  }));

  return NextResponse.json(mapped);
}
