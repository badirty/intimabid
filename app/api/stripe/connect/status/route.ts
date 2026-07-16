import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { stripeSecretKey } from '@/lib/env';

export async function GET() {
  if (!stripeSecretKey) {
    return NextResponse.json({ connected: false, payouts_enabled: false, error: 'Stripe non configuré' });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_id')
    .eq('id', user.id)
    .maybeSingle();

  const connectId = profile?.stripe_connect_id as string | undefined;
  if (!connectId) {
    return NextResponse.json({ connected: false, payouts_enabled: false, details_submitted: false });
  }

  const stripe = new Stripe(stripeSecretKey);
  const account = await stripe.accounts.retrieve(connectId);

  return NextResponse.json({
    connected: true,
    payouts_enabled: account.payouts_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
    business_type: account.business_type ?? null,
    /** true si l'ancien compte société doit être remplacé au prochain onboarding */
    needs_individual_reset:
      account.business_type !== 'individual' && !(account.payouts_enabled && account.business_type === 'company'),
    connect_account_id: connectId,
  });
}