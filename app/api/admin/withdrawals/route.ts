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
    const { data: withdrawals, error } = await admin
      .from('withdrawal_requests')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();
    if (authError) {
      return NextResponse.json({ error: `auth.listUsers: ${authError.message}` }, { status: 500 });
    }

    const emailMap = new Map<string, string>();
    if (authUsers?.users) {
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
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
