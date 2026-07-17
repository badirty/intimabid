import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { executeStripeWithdrawal, rollbackWithdrawal } from '@/lib/stripe-withdraw';
import { stripeSecretKey } from '@/lib/env';
import { assertNotSuspended, createAdminClient } from '@/lib/admin';

export async function POST(request: Request) {
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  try {
    const adminClient = createAdminClient();
    await assertNotSuspended(adminClient, user.id);
  } catch {
    return NextResponse.json({ error: 'Compte suspendu' }, { status: 403 });
  }

  const { amount_cents } = await request.json();
  if (!amount_cents || amount_cents < 100) {
    return NextResponse.json({ error: 'Montant minimum : 1 €' }, { status: 400 });
  }
  if (amount_cents > 50000) {
    return NextResponse.json({ error: 'Montant maximum : 500 €' }, { status: 400 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_id')
    .eq('id', user.id)
    .maybeSingle();

  const connectId = profile?.stripe_connect_id as string | undefined;
  if (!connectId) {
    return NextResponse.json(
      { error: 'Configure d\'abord Stripe Connect pour recevoir tes virements.' },
      { status: 400 },
    );
  }

  const stripe = new Stripe(stripeSecretKey);
  const account = await stripe.accounts.retrieve(connectId);
  if (!account.payouts_enabled) {
    return NextResponse.json(
      { error: 'Termine la configuration Stripe Connect (RIB / identité) avant de retirer.' },
      { status: 400 },
    );
  }

  const { data: reserve, error: reserveErr } = await supabase.rpc('request_withdrawal', {
    p_amount_cents: amount_cents,
  });
  if (reserveErr) {
    return NextResponse.json({ error: reserveErr.message }, { status: 400 });
  }

  const requestId = (reserve as { request_id?: string })?.request_id;
  if (!requestId) {
    return NextResponse.json({ error: 'Erreur interne — retrait non enregistré' }, { status: 500 });
  }

  try {
    const transferId = await executeStripeWithdrawal(connectId, amount_cents, requestId, user.id);
    return NextResponse.json({
      ok: true,
      transfer_id: transferId,
      message: 'Virement envoyé vers ton compte bancaire (délai Stripe habituel : 1–3 jours ouvrés).',
    });
  } catch (e) {
    try {
      await rollbackWithdrawal(requestId);
    } catch (rollbackErr) {
      console.error('[withdraw] rollback failed:', rollbackErr);
    }
    const message = e instanceof Error ? e.message : 'Échec du virement';
    return NextResponse.json({ error: message }, { status: 502 });
  }
}