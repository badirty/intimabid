import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { stripeSecretKey, siteUrl } from '@/lib/env';

export async function POST() {
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const stripe = new Stripe(stripeSecretKey);

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_id, display_name')
    .eq('id', user.id)
    .maybeSingle();

  let accountId = profile?.stripe_connect_id as string | undefined;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email: user.email ?? undefined,
      capabilities: { transfers: { requested: true } },
      business_profile: { name: profile?.display_name ?? 'badirty vendeur' },
    });
    accountId = account.id;
    await supabase.from('profiles').upsert({ id: user.id, stripe_connect_id: accountId }, { onConflict: 'id' });
  }

  const link = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${siteUrl}/?wallet=connect_refresh`,
    return_url: `${siteUrl}/?wallet=connect_done`,
    type: 'account_onboarding',
  });

  return NextResponse.json({ url: link.url });
}