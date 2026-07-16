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

    const { accountId, stripe } = await ensureIndividualConnectAccount(user);

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
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur Account Session';
    console.error('[connect account-session]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
