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

  const agreement =
    (account as { controller?: { service_agreement?: string | null } }).controller
      ?.service_agreement ?? null;

  return NextResponse.json({
    connected: true,
    payouts_enabled: account.payouts_enabled ?? false,
    details_submitted: account.details_submitted ?? false,
    /** Côté API Stripe : `individual` = personne physique, `company` = société */
    business_type: account.business_type ?? null,
    service_agreement: agreement,
    account_kind: account.metadata?.account_kind ?? null,
    needs_individual_reset: account.business_type === 'company' && !account.payouts_enabled,
    connect_account_id: connectId,
  });
}