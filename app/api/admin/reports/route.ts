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
  const { data: reports, error } = await admin
    .from('reports')
    .select('*, reporter:profiles!reports_reporter_id_fkey(display_name)')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();
  const emailMap = new Map<string, string>();
  if (!authError && authUsers?.users) {
    for (const u of authUsers.users) {
      if (u.email) emailMap.set(u.id, u.email);
    }
  }

  const mapped = (reports ?? []).map((r) => ({
    id: r.id,
    reporter_id: r.reporter_id,
    reporter_email: emailMap.get(r.reporter_id) ?? null,
    reporter_name: (r.reporter as { display_name?: string | null } | null)?.display_name ?? null,
    auction_id: r.auction_id,
    reason: r.reason,
    details: r.details,
    created_at: r.created_at,
  }));

  return NextResponse.json(mapped);
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !isAdminEmail(user.email)) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 });
  }

  const { id } = await request.json().catch(() => ({}));
  if (!id) {
    return NextResponse.json({ error: 'ID manquant' }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from('reports').delete().eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
