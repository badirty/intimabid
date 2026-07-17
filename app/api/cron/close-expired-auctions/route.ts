import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/admin';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  const expected = process.env.CRON_SECRET ? `Bearer ${process.env.CRON_SECRET}` : null;

  if (!expected || authHeader !== expected) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 });
  }

  const admin = createAdminClient();
  const { error } = await admin.rpc('close_expired_auctions');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
