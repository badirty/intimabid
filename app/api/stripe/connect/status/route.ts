import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createClient } from '@/lib/supabase/server';
import { stripeSecretKey } from '@/lib/env';

function humanizeRequirement(key: string): string {
  if (key.includes('verification.document')) return 'Pièce d’identité (CNI / passeport)';
  if (key.includes('verification.proof_of_liveness')) return 'Vérification selfie / vivacité';
  if (key.includes('verification.additional_document')) return 'Justificatif d’adresse';
  if (key.includes('external_account')) return 'RIB / compte bancaire';
  if (key.includes('dob')) return 'Date de naissance';
  if (key.includes('address')) return 'Adresse';
  if (key.includes('first_name') || key.includes('last_name')) return 'Nom complet';
  if (key.includes('email')) return 'E-mail';
  if (key.includes('phone')) return 'Téléphone';
  if (key.includes('tos_acceptance')) return 'Acceptation des conditions';
  return key;
}

export async function GET() {
  if (!stripeSecretKey) {
    return NextResponse.json({
      connected: false,
      payouts_enabled: false,
      linked: false,
      ready: false,
      error: 'Stripe non configuré',
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non connecté' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_id')
    .eq('id', user.id)
    .maybeSingle();

  const connectId = profile?.stripe_connect_id as string | undefined;
  if (!connectId) {
    return NextResponse.json({
      connected: false,
      linked: false,
      ready: false,
      payouts_enabled: false,
      details_submitted: false,
      has_external_account: false,
      currently_due: [],
      currently_due_labels: [],
    });
  }

  const stripe = new Stripe(stripeSecretKey);
  const account = await stripe.accounts.retrieve(connectId);

  let hasExternalAccount = false;
  try {
    const banks = await stripe.accounts.listExternalAccounts(connectId, {
      object: 'bank_account',
      limit: 1,
    });
    hasExternalAccount = (banks.data?.length ?? 0) > 0;
  } catch {
    hasExternalAccount = false;
  }

  const currentlyDue = account.requirements?.currently_due ?? [];
  const pastDue = account.requirements?.past_due ?? [];
  const pendingVerification = account.requirements?.pending_verification ?? [];
  const allDue = [...new Set([...currentlyDue, ...pastDue])];

  const kind = account.metadata?.account_kind ?? '';
  const formSubmitted = kind.startsWith('badirty_payout');
  const hasIdentity = !!(account.individual?.first_name && account.individual?.last_name);

  // Compte "lié" = formulaire envoyé / RIB présent / détails soumis
  const linked =
    hasExternalAccount ||
    !!account.details_submitted ||
    (formSubmitted && hasIdentity) ||
    (formSubmitted && hasExternalAccount);

  const payoutsEnabled = !!account.payouts_enabled;
  const transfersStatus = account.capabilities?.transfers ?? null;
  const ready = payoutsEnabled || transfersStatus === 'active';

  return NextResponse.json({
    connected: true,
    linked,
    ready,
    payouts_enabled: payoutsEnabled,
    details_submitted: account.details_submitted ?? false,
    has_external_account: hasExternalAccount,
    business_type: account.business_type ?? null,
    account_kind: kind || null,
    transfers_status: transfersStatus,
    currently_due: allDue,
    currently_due_labels: allDue.map(humanizeRequirement),
    pending_verification: pendingVerification,
    connect_account_id: connectId,
  });
}
