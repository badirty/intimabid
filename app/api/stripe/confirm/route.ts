import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { creditStripeTopup } from '@/lib/stripe-credit';
import { stripeSecretKey, supabaseAnonKey, supabaseUrl } from '@/lib/env';

async function resolveUser(request: Request) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) return user;

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const tokenClient = createClient(supabaseUrl, supabaseAnonKey);
  const { data: { user: tokenUser } } = await tokenClient.auth.getUser(token);
  return tokenUser ?? null;
}

export async function POST(request: Request) {
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
  }

  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Session expirée' }, { status: 401 });
    }

    const { session_id: sessionId } = await request.json();
    if (!sessionId || typeof sessionId !== 'string') {
      return NextResponse.json({ error: 'session_id manquant' }, { status: 400 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    if (session.payment_status !== 'paid') {
      return NextResponse.json({ error: 'Paiement non confirmé' }, { status: 402 });
    }

    const metaUserId = session.metadata?.user_id;
    const amountCents = parseInt(session.metadata?.amount_cents ?? '0', 10);

    if (metaUserId !== user.id) {
      return NextResponse.json({ error: 'Session invalide pour ce compte' }, { status: 403 });
    }
    if (!amountCents) {
      return NextResponse.json({ error: 'Montant introuvable' }, { status: 400 });
    }

    const result = await creditStripeTopup(user.id, amountCents, sessionId);

    return NextResponse.json({
      ok: true,
      credited: result.credited,
      balance_cents: result.balance_cents,
      amount_cents: amountCents,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur confirmation';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}