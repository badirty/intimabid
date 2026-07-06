import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return NextResponse.json({ error: 'Stripe non configuré. Utilise la recharge démo.' }, { status: 503 });
  }

  try {
    const { amount_cents } = await request.json();
    if (!amount_cents || amount_cents < 100) {
      return NextResponse.json({ error: 'Montant invalide' }, { status: 400 });
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
      metadata: { type: 'wallet_topup' },
    });

    return NextResponse.json({ url: session.url });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erreur Stripe' }, { status: 500 });
  }
}