import { NextResponse } from 'next/server';
import {
  ensureIndividualConnectAccount,
  resolveRequestUser,
} from '@/lib/stripe-connect';
import { siteUrl, stripeSecretKey } from '@/lib/env';

/**
 * Fallback : onboarding Stripe hébergé (redirect).
 * Le flux principal est l'embedded via /api/stripe/connect/account-session.
 */
export async function POST(request: Request) {
  if (!stripeSecretKey) {
    return NextResponse.json({ error: 'Stripe non configuré' }, { status: 503 });
  }

  try {
    const user = await resolveRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Non connecté' }, { status: 401 });
    }

    const { accountId, stripe } = await ensureIndividualConnectAccount(user);

    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${siteUrl}/?wallet=connect_refresh`,
      return_url: `${siteUrl}/?wallet=connect_done`,
      type: 'account_onboarding',
      collection_options: {
        fields: 'currently_due',
        future_requirements: 'omit',
      },
    });

    return NextResponse.json({ url: link.url });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur Stripe Connect';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
