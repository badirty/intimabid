import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { supabaseAnonKey, supabaseUrl } from '@/lib/supabase/env';

export async function POST(request: Request) {
  const secret = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
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
    const session = event.data.object as { metadata?: Record<string, string> };
    const userId = session.metadata?.user_id;
    const amountCents = parseInt(session.metadata?.amount_cents ?? '0', 10);

    if (userId && amountCents > 0) {
      const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      const client = serviceKey
        ? createClient(supabaseUrl, serviceKey)
        : createClient(supabaseUrl, supabaseAnonKey);

      const { data: wallet } = await client.from('wallets').select('*').eq('user_id', userId).maybeSingle();
      const newBalance = (wallet?.balance_cents ?? 0) + amountCents;
      await client.from('wallets').upsert({
        user_id: userId,
        balance_cents: newBalance,
        pending_cents: wallet?.pending_cents ?? 0,
      });
      await client.from('wallet_transactions').insert({
        user_id: userId,
        type: 'topup_stripe',
        amount_cents: amountCents,
        description: 'Recharge Stripe',
      });
    }
  }

  return NextResponse.json({ received: true });
}