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
    const { data: reports, error } = await admin
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const reporterIds = [...new Set((reports ?? []).map((r) => r.reporter_id).filter(Boolean))];
    let profiles: { id: string; display_name: string | null }[] = [];
    if (reporterIds.length > 0) {
      const { data, error: profilesError } = await admin
        .from('profiles')
        .select('id, display_name')
        .in('id', reporterIds);
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

    const mapped = (reports ?? []).map((r) => ({
      id: r.id,
      reporter_id: r.reporter_id,
      reporter_email: emailMap.get(r.reporter_id) ?? null,
      reporter_name: profileMap.get(r.reporter_id) ?? null,
      auction_id: r.auction_id,
      reason: r.reason,
      details: r.details,
      created_at: r.created_at,
    }));

    return NextResponse.json(mapped);
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
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
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
