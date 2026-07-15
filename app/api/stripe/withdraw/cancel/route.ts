import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { data, error } = await supabase.rpc('cancel_pending_withdrawal');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  const cancelled = (data as { cancelled_cents?: number })?.cancelled_cents ?? 0;
  return NextResponse.json({
    ok: true,
    cancelled_cents: cancelled,
    message: cancelled > 0
      ? 'Retrait annulé — le montant est de nouveau disponible sur ton portefeuille.'
      : 'Aucun retrait en attente.',
  });
}