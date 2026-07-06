import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import { siteUrl, stripeConfigStatus, stripeSecretKey, supabaseAnonKey, supabaseUrl } from '@/lib/env';

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
  const stripeStatus = stripeConfigStatus();
  if (!stripeStatus.configured) {
    return NextResponse.json(
      {
        error: 'Stripe non configuré sur le serveur.',
        hint: `Variables manquantes sur Vercel : ${stripeStatus.missing.join(', ')}`,
        missing: stripeStatus.missing,
      },
      { status: 503 },
    );
  }

  try {
    const user = await resolveUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Session expirée — reconnecte-toi.' }, { status: 401 });
    }

    const { amount_cents } = await request.json();
    if (!amount_cents || amount_cents < 100) {
      return NextResponse.json({ error: 'Montant invalide (min 1€)' }, { status: 400 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(stripeSecretKey!);

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{
        price_data: {
          currency: 'eur',
          unit_amount: amount_cents,
          product_data: { name: 'Recharge portefeuille badirty' },
        },
        quantity: 1,
      }],
      success_url: `${siteUrl}/?wallet=success`,
      cancel_url: `${siteUrl}/?wallet=cancel`,
      metadata: {
        type: 'wallet_topup',
        user_id: user.id,
        amount_cents: String(amount_cents),
      },
    });

    if (!session.url) {
      return NextResponse.json({ error: 'Stripe n’a pas renvoyé d’URL de paiement.' }, { status: 500 });
    }

    return NextResponse.json({ url: session.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur Stripe';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}