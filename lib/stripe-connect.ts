import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { createClient as createServerSupabase } from '@/lib/supabase/server';
import {
  stripeSecretKey,
  siteUrl,
  supabaseAnonKey,
  supabaseServiceRoleKey,
  supabaseUrl,
} from '@/lib/env';

/** Tag metadata pour savoir si le compte a le bon setup "retrait particulier". */
const ACCOUNT_KIND = 'recipient_individual_v2';

/**
 * Compte Connect = **personne physique qui reçoit des virements** (retrait wallet).
 * - business_type: individual (pas company / société)
 * - service_agreement: recipient (pas "full merchant" — uniquement recevoir des fonds de la plateforme)
 * - capabilities: transfers only (pas card_payments)
 *
 * Note FR : l'UI Stripe peut encore afficher "Entrepreneur individuel" / "type d'entreprise"
 * dans le libellé légal — ce n'est PAS une SARL. Côté API c'est `individual` + `recipient`.
 */
function createRecipientIndividualAccount(stripe: Stripe, email?: string) {
  return stripe.accounts.create({
    type: 'express',
    country: 'FR',
    email,
    business_type: 'individual',
    capabilities: {
      transfers: { requested: true },
    },
    // Destinataire de fonds plateforme uniquement (pas d'encaissement client sur ce compte)
    tos_acceptance: {
      service_agreement: 'recipient',
    },
    individual: {
      email,
    },
    // Minimal : évite un profil "boutique" trop chargé
    business_profile: {
      product_description: 'Retrait de solde badirty (particulier)',
      mcc: '7299', // Miscellaneous personal services — neutre
      url: siteUrl,
    },
    settings: {
      payouts: {
        schedule: { interval: 'daily' },
      },
    },
    metadata: {
      platform: 'badirty',
      account_kind: ACCOUNT_KIND,
    },
  });
}

function isRecipientIndividual(account: Stripe.Account): boolean {
  if (account.business_type !== 'individual') return false;
  if (account.metadata?.account_kind === ACCOUNT_KIND) return true;
  // Comptes créés à la main / anciens : regarder l'accord de service
  const agreement =
    (account as { controller?: { service_agreement?: string | null } }).controller
      ?.service_agreement ??
    (account as { tos_acceptance?: { service_agreement?: string | null } }).tos_acceptance
      ?.service_agreement;
  // Si déjà individual + payouts OK, on ne casse pas
  if (account.payouts_enabled && account.business_type === 'individual') return true;
  // Sinon on exige le tag v2 (recipient) pour forcer la migration
  return agreement === 'recipient';
}

/**
 * Recrée si :
 * - force reset
 * - type société / vide
 * - individual mais ancien flux "full merchant" (pas encore recipient v2) et retraits pas actifs
 */
function shouldRecreateAccount(account: Stripe.Account, forceReset = false): boolean {
  if (forceReset) return true;
  if (isRecipientIndividual(account) && account.metadata?.account_kind === ACCOUNT_KIND) {
    return false;
  }
  // Société → toujours recréer (sauf payouts company déjà OK — rare)
  if (account.business_type === 'company') {
    return !account.payouts_enabled;
  }
  // Individual sans le bon setup, et pas encore opérationnel → recréer en recipient
  if (account.business_type === 'individual' && !account.payouts_enabled) {
    return account.metadata?.account_kind !== ACCOUNT_KIND;
  }
  // Type inconnu, pas de payouts
  if (!account.business_type && !account.payouts_enabled) return true;
  // Déjà payouts_enabled : on laisse (ne bloque pas un user qui retire déjà)
  if (account.payouts_enabled) return false;
  return !isRecipientIndividual(account);
}

export type ResolvedUser = {
  id: string;
  email?: string | null;
};

/** Auth cookie session, sinon Bearer (clients hors cookie). */
export async function resolveRequestUser(request: Request): Promise<ResolvedUser | null> {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) return { id: user.id, email: user.email };

  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.slice(7);
  const tokenClient = createClient(supabaseUrl, supabaseAnonKey);
  const {
    data: { user: tokenUser },
  } = await tokenClient.auth.getUser(token);
  if (!tokenUser) return null;
  return { id: tokenUser.id, email: tokenUser.email };
}

async function persistConnectAccountId(
  userId: string,
  accountId: string,
  supabase: Awaited<ReturnType<typeof createServerSupabase>>,
) {
  const { error } = await supabase
    .from('profiles')
    .upsert({ id: userId, stripe_connect_id: accountId }, { onConflict: 'id' });

  if (error) {
    if (!supabaseServiceRoleKey) throw new Error(error.message);
    const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
    const { error: adminErr } = await admin
      .from('profiles')
      .upsert({ id: userId, stripe_connect_id: accountId }, { onConflict: 'id' });
    if (adminErr) throw new Error(adminErr.message);
  }
}

/**
 * Garantit un compte Connect **particulier destinataire** (recipient + individual).
 */
export async function ensureIndividualConnectAccount(
  user: ResolvedUser,
  opts?: { forceReset?: boolean },
): Promise<{ accountId: string; stripe: Stripe; recreated: boolean; businessType: string | null }> {
  if (!stripeSecretKey) {
    throw new Error('Stripe non configuré');
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = await createServerSupabase();
  const forceReset = opts?.forceReset === true;

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_id')
    .eq('id', user.id)
    .maybeSingle();

  let accountId = profile?.stripe_connect_id as string | undefined;
  let recreated = false;
  let previousAccountId: string | undefined;
  let businessType: string | null = null;

  if (accountId) {
    try {
      const existing = await stripe.accounts.retrieve(accountId);
      businessType = existing.business_type ?? null;
      if (shouldRecreateAccount(existing, forceReset)) {
        previousAccountId = accountId;
        accountId = undefined;
        recreated = true;
        console.info('[stripe-connect] recreate as recipient individual', {
          userId: user.id,
          previous: previousAccountId,
          wasType: existing.business_type,
          wasKind: existing.metadata?.account_kind,
          details_submitted: existing.details_submitted,
          forceReset,
        });
      }
    } catch {
      previousAccountId = accountId;
      accountId = undefined;
      recreated = true;
    }
  }

  if (!accountId) {
    let account: Stripe.Account;
    try {
      account = await createRecipientIndividualAccount(stripe, user.email ?? undefined);
    } catch (e) {
      // Si recipient non dispo sur le compte plateforme (config Dashboard),
      // fallback individual express classique — toujours pas company.
      const msg = e instanceof Error ? e.message : String(e);
      console.warn('[stripe-connect] recipient create failed, fallback individual:', msg);
      account = await stripe.accounts.create({
        type: 'express',
        country: 'FR',
        email: user.email ?? undefined,
        business_type: 'individual',
        capabilities: { transfers: { requested: true } },
        individual: { email: user.email ?? undefined },
        business_profile: {
          product_description: 'Retrait de solde badirty (particulier)',
          mcc: '7299',
          url: siteUrl,
        },
        metadata: {
          platform: 'badirty',
          account_kind: ACCOUNT_KIND,
          recipient_fallback: '1',
        },
      });
    }
    accountId = account.id;
    businessType = account.business_type ?? 'individual';
    await persistConnectAccountId(user.id, accountId, supabase);

    if (previousAccountId) {
      try {
        await stripe.accounts.del(previousAccountId);
      } catch {
        /* ignore */
      }
    }
  }

  return { accountId, stripe, recreated, businessType };
}
