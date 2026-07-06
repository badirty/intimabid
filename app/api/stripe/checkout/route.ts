import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/env';

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'Stripe non configuré.' }, { status: 503 });
  }

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const supabase = createClient(supabaseUrl, supabaseAnonKey);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Session invalide' }, { status: 401 });
    }

    const { amount_cents } = await request.json();
    if (!amount_cents || amount_cents < 100) {
      return NextResponse.json({ error: 'Montant invalide (min 1€)' }, { status: 400 });
    }

    const Stripe = (await import('stripe')).default;
    const stripe = new Stripe(secret);
    const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://badirty.fr';

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
      success_url: `${origin}/?wallet=success`,
      cancel_url: `${origin}/?wallet=cancel`,
      metadata: {
        type: 'wallet_topup',
        user_id: user.id,
        amount_cents: String(amount_cents),
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur Stripe' }, { status: 500 });
  }
}