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

    // Test 1: can we query the database with the service role key?
    const { count: profilesCount, error: profilesError } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    // Test 2: can we call auth admin API?
    const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();

    return NextResponse.json({
      ok: !profilesError && !authError,
      profiles_count: profilesCount ?? 0,
      profiles_error: profilesError?.message ?? null,
      auth_users_count: authUsers?.users?.length ?? 0,
      auth_error: authError?.message ?? null,
      service_role_key_preview: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? `${process.env.SUPABASE_SERVICE_ROLE_KEY.slice(0, 8)}...`
        : null,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur inconnue';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
