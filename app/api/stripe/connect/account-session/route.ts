import { NextResponse } from 'next/server';
import {
  ensureIndividualConnectAccount,
  resolveRequestUser,
} from '@/lib/stripe-connect';
import { stripeConfigStatus, stripePublishableKey, stripeSecretKey } from '@/lib/env';

/**
 * Crée une Account Session pour le composant Embedded Account Onboarding.
 * L'utilisateur reste sur badirty.fr (UI teintée Badirty).
 */
export async function POST(request: Request) {
  const status = stripeConfigStatus();
  if (!status.configured || !stripeSecretKey || !stripePublishableKey) {
    return NextResponse.json(
      {
        error: 'Stripe non configuré',
        missing: status.missing,
      },
      { status: 503 },
    );
  }

  try {
    const user = await resolveRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Session expirée — reconnecte-toi.' }, { status: 401 });
    }

    let forceReset = false;
    try {
      const body = await request.json();
      forceReset = body?.force_reset === true;
    } catch {
      /* body vide OK */
    }

    const { accountId, stripe, recreated } = await ensureIndividualConnectAccount(user, {
      forceReset,
    });

    // Vérif sécurité : le compte utilisé doit bien être individual
    const account = await stripe.accounts.retrieve(accountId);
    if (account.business_type && account.business_type !== 'individual') {
      const retry = await ensureIndividualConnectAccount(user, { forceReset: true });
      const session = await retry.stripe.accountSessions.create({
        account: retry.accountId,
        components: {
          account_onboarding: {
            enabled: true,
            features: { external_account_collection: true },
          },
        },
      });
      return NextResponse.json({
        client_secret: session.client_secret,
        publishable_key: stripePublishableKey,
        recreated: true,
        business_type: 'individual',
      });
    }

    const accountSession = await stripe.accountSessions.create({
      account: accountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            // Collecte RIB dans le composant (Express / particulier)
            external_account_collection: true,
          },
        },
      },
    });

    return NextResponse.json({
      client_secret: accountSession.client_secret,
      publishable_key: stripePublishableKey,
      recreated,
      business_type: account.business_type ?? 'individual',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur Account Session';
    console.error('[connect account-session]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
