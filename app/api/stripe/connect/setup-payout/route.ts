import { NextResponse } from 'next/server';
import {
  resolveRequestUser,
  setupPayoutWithIdentity,
  type PayoutIdentityInput,
} from '@/lib/stripe-connect';
import { stripeConfigStatus } from '@/lib/env';

/**
 * Formulaire Badirty uniquement : identité + RIB.
 * Aucune UI Stripe "type d'entreprise" / "site web entreprise".
 */
export async function POST(request: Request) {
  const status = stripeConfigStatus();
  if (!status.configured) {
    return NextResponse.json(
      { error: 'Stripe non configuré', missing: status.missing },
      { status: 503 },
    );
  }

  try {
    const user = await resolveRequestUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Session expirée — reconnecte-toi.' }, { status: 401 });
    }

    const body = (await request.json()) as Partial<PayoutIdentityInput>;
    const input: PayoutIdentityInput = {
      firstName: String(body.firstName ?? ''),
      lastName: String(body.lastName ?? ''),
      birthDate: String(body.birthDate ?? ''),
      addressLine1: String(body.addressLine1 ?? ''),
      addressLine2: body.addressLine2 ? String(body.addressLine2) : undefined,
      city: String(body.city ?? ''),
      postalCode: String(body.postalCode ?? ''),
      iban: String(body.iban ?? ''),
    };

    const result = await setupPayoutWithIdentity(user, input, request);

    // Prêt à retirer si payouts actifs, ou si plus rien de bloquant côté "currently_due"
    // (Stripe peut encore demander une pièce d'identité plus tard selon les montants)
    const blocking = result.currentlyDue.filter(
      (r) =>
        !r.startsWith('individual.verification.document') &&
        r !== 'external_account',
    );
    const ready = result.payoutsEnabled || (result.detailsSubmitted && blocking.length === 0);

    return NextResponse.json({
      ok: true,
      account_id: result.accountId,
      payouts_enabled: result.payoutsEnabled,
      ready,
      currently_due: result.currentlyDue,
      message: result.payoutsEnabled
        ? 'Compte bancaire lié — tu peux retirer.'
        : result.currentlyDue.some((r) => r.includes('verification'))
          ? 'Infos enregistrées. Une vérification d’identité peut encore être demandée par Stripe.'
          : 'Infos enregistrées. Les retraits s’activent dès validation Stripe (souvent immédiat).',
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Erreur configuration retrait';
    console.error('[setup-payout]', message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
