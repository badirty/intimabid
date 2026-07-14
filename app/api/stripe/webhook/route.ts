import { NextResponse } from 'next/server';
import { creditStripeTopup } from '@/lib/stripe-credit';
import { stripeSecretKey, stripeWebhookSecret } from '@/lib/env';

export async function POST(request: Request) {
  const secret = stripeSecretKey;
  const webhookSecret = stripeWebhookSecret;
  if (!secret || !webhookSecret) {
    return NextResponse.json({ error: 'Webhook non configuré' }, { status: 503 });
  }

  const body = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) return NextResponse.json({ error: 'Signature manquante' }, { status: 400 });

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(secret);

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Signature invalide' }, { status: 400 });
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as { id: string; metadata?: Record<string, string> };
    const userId = session.metadata?.user_id;
    const amountCents = parseInt(session.metadata?.amount_cents ?? '0', 10);

    if (userId && amountCents > 0) {
      try {
        await creditStripeTopup(userId, amountCents, session.id);
      } catch (e) {
        const message = e instanceof Error ? e.message : 'Erreur crédit wallet';
        console.error('[stripe webhook] credit failed:', message);
        return NextResponse.json({ error: message }, { status: 500 });
      }
    }
  }

  return NextResponse.json({ received: true });
}