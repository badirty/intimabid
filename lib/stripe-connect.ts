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

/**
 * Comptes créés via le formulaire Badirty (pas l'UI Stripe "type d'entreprise").
 * business_type / site / MCC : uniquement côté serveur, jamais montrés à l'user.
 *
 * Important FR→FR : ne PAS utiliser service_agreement: 'recipient'
 * (Stripe : "not supported for platforms in FR creating accounts in FR").
 * On utilise l'accord full par défaut.
 */
const ACCOUNT_KIND = 'badirty_payout_form_v2';

export type ResolvedUser = {
  id: string;
  email?: string | null;
};

export type PayoutIdentityInput = {
  firstName: string;
  lastName: string;
  /** YYYY-MM-DD */
  birthDate: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postalCode: string;
  /** IBAN FR… (espaces tolérés) */
  iban: string;
};

function sellerProfileUrl(userId: string) {
  return `${siteUrl.replace(/\/$/, '')}/seller/${userId}`;
}

function parseBirthDate(iso: string): { day: number; month: number; year: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) throw new Error('Date de naissance invalide (AAAA-MM-JJ)');
  const year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  if (year < 1920 || year > new Date().getFullYear() - 18) {
    throw new Error('Tu dois avoir au moins 18 ans');
  }
  return { day, month, year };
}

function normalizeIban(iban: string): string {
  const clean = iban.replace(/\s+/g, '').toUpperCase();
  if (!/^FR\d{12}[A-Z0-9]{11}\d{2}$/i.test(clean) && !/^FR\d{25}$/i.test(clean)) {
    // FR IBAN = 27 chars ; on accepte tout IBAN EU basique 15–34
    if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(clean)) {
      throw new Error('IBAN invalide');
    }
  }
  return clean;
}

/** Auth cookie session, sinon Bearer. */
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

function clientIp(request: Request): string {
  const xf = request.headers.get('x-forwarded-for');
  if (xf) return xf.split(',')[0]?.trim() || '127.0.0.1';
  return request.headers.get('x-real-ip') || '127.0.0.1';
}

/**
 * Crée (ou remplace) un compte Connect Custom **individual** entièrement
 * prérempli côté serveur. L'utilisateur ne voit jamais type d'entreprise / site web.
 */
export async function setupPayoutWithIdentity(
  user: ResolvedUser,
  input: PayoutIdentityInput,
  request: Request,
): Promise<{
  accountId: string;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  currentlyDue: string[];
}> {
  if (!stripeSecretKey) throw new Error('Stripe non configuré');
  if (!user.email) throw new Error('Email manquant sur le compte');

  const firstName = input.firstName.trim();
  const lastName = input.lastName.trim();
  if (firstName.length < 2 || lastName.length < 2) {
    throw new Error('Prénom et nom requis');
  }

  const dob = parseBirthDate(input.birthDate);
  const iban = normalizeIban(input.iban);
  const line1 = input.addressLine1.trim();
  const city = input.city.trim();
  const postalCode = input.postalCode.trim();
  if (!line1 || !city || !postalCode) {
    throw new Error('Adresse complète requise');
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = await createServerSupabase();
  const ip = clientIp(request);
  const tosDate = Math.floor(Date.now() / 1000);

  // Ancien compte Express / société non finalisé → on repart propre
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_id')
    .eq('id', user.id)
    .maybeSingle();

  const previousId = profile?.stripe_connect_id as string | undefined;
  if (previousId) {
    try {
      const prev = await stripe.accounts.retrieve(previousId);
      const keep =
        prev.payouts_enabled &&
        prev.business_type === 'individual' &&
        prev.metadata?.account_kind === ACCOUNT_KIND;
      if (!keep) {
        try {
          await stripe.accounts.del(previousId);
        } catch {
          /* ignore */
        }
      } else {
        // Mise à jour RIB / identité sur compte déjà bon
        await stripe.accounts.update(previousId, {
          individual: {
            first_name: firstName,
            last_name: lastName,
            email: user.email,
            dob,
            address: {
              line1,
              line2: input.addressLine2?.trim() || undefined,
              city,
              postal_code: postalCode,
              country: 'FR',
            },
          },
          external_account: {
            object: 'bank_account',
            country: 'FR',
            currency: 'eur',
            account_number: iban,
            account_holder_name: `${firstName} ${lastName}`,
            account_holder_type: 'individual',
          },
        });
        const refreshed = await stripe.accounts.retrieve(previousId);
        return {
          accountId: previousId,
          payoutsEnabled: !!refreshed.payouts_enabled,
          detailsSubmitted: !!refreshed.details_submitted,
          currentlyDue: refreshed.requirements?.currently_due ?? [],
        };
      }
    } catch {
      /* recreate below */
    }
  }

  const businessProfile = {
    mcc: '5931',
    url: sellerProfileUrl(user.id),
    product_description:
      'Vendeur particulier : revente d’articles entre particuliers (marketplace badirty)',
  };

  const individual = {
    first_name: firstName,
    last_name: lastName,
    email: user.email,
    dob,
    address: {
      line1,
      line2: input.addressLine2?.trim() || undefined,
      city,
      postal_code: postalCode,
      country: 'FR' as const,
    },
  };

  const externalAccount: Stripe.AccountCreateParams.ExternalAccount = {
    object: 'bank_account',
    country: 'FR',
    currency: 'eur',
    account_number: iban,
    account_holder_name: `${firstName} ${lastName}`,
    account_holder_type: 'individual',
  };

  let account: Stripe.Account;

  try {
    // Custom = l'UI Stripe "entreprise" n'est jamais montrée à l'utilisateur.
    // ToS full (défaut) — recipient interdit pour plateforme FR → compte FR.
    account = await stripe.accounts.create({
      type: 'custom',
      country: 'FR',
      email: user.email,
      business_type: 'individual',
      capabilities: {
        transfers: { requested: true },
      },
      tos_acceptance: {
        date: tosDate,
        ip,
      },
      business_profile: businessProfile,
      individual,
      external_account: externalAccount,
      settings: {
        payouts: { schedule: { interval: 'daily' } },
      },
      metadata: {
        platform: 'badirty',
        account_kind: ACCOUNT_KIND,
        user_id: user.id,
      },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn('[stripe-connect] custom create failed, try express prefilled:', msg);

    // Fallback Express prérempli (ToS accepté pendant/via nos données, pas recipient)
    account = await stripe.accounts.create({
      type: 'express',
      country: 'FR',
      email: user.email,
      business_type: 'individual',
      capabilities: { transfers: { requested: true } },
      business_profile: businessProfile,
      individual,
      external_account: externalAccount,
      settings: {
        payouts: { schedule: { interval: 'daily' } },
      },
      metadata: {
        platform: 'badirty',
        account_kind: ACCOUNT_KIND,
        user_id: user.id,
        custom_fallback: 'express',
      },
    });
  }

  await persistConnectAccountId(user.id, account.id, supabase);

  const full = await stripe.accounts.retrieve(account.id);
  return {
    accountId: full.id,
    payoutsEnabled: !!full.payouts_enabled,
    detailsSubmitted: !!full.details_submitted,
    currentlyDue: full.requirements?.currently_due ?? [],
  };
}

/**
 * Compat : ancien flux Account Session / Express.
 * Pour le nouveau formulaire, préférer setupPayoutWithIdentity.
 */
export async function ensureIndividualConnectAccount(
  user: ResolvedUser,
  opts?: { forceReset?: boolean },
): Promise<{ accountId: string; stripe: Stripe; recreated: boolean; businessType: string | null }> {
  if (!stripeSecretKey) throw new Error('Stripe non configuré');

  const stripe = new Stripe(stripeSecretKey);
  const supabase = await createServerSupabase();

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_id')
    .eq('id', user.id)
    .maybeSingle();

  let accountId = profile?.stripe_connect_id as string | undefined;
  let recreated = false;
  let businessType: string | null = null;

  if (accountId && !opts?.forceReset) {
    try {
      const existing = await stripe.accounts.retrieve(accountId);
      businessType = existing.business_type ?? null;
      if (existing.metadata?.account_kind === ACCOUNT_KIND || existing.payouts_enabled) {
        return { accountId, stripe, recreated: false, businessType };
      }
    } catch {
      accountId = undefined;
      recreated = true;
    }
  } else if (accountId && opts?.forceReset) {
    try {
      await stripe.accounts.del(accountId);
    } catch {
      /* ignore */
    }
    accountId = undefined;
    recreated = true;
  }

  if (!accountId) {
    // Compte minimal ; le formulaire Badirty complètera via setupPayoutWithIdentity
    const account = await stripe.accounts.create({
      type: 'custom',
      country: 'FR',
      email: user.email ?? undefined,
      business_type: 'individual',
      capabilities: { transfers: { requested: true } },
      business_profile: {
        mcc: '5931',
        url: sellerProfileUrl(user.id),
        product_description:
          'Vendeur particulier : revente d’articles entre particuliers (marketplace badirty)',
      },
      metadata: {
        platform: 'badirty',
        account_kind: ACCOUNT_KIND,
        user_id: user.id,
        incomplete: '1',
      },
    });
    accountId = account.id;
    businessType = 'individual';
    await persistConnectAccountId(user.id, accountId, supabase);
    recreated = true;
  }

  return { accountId, stripe, recreated, businessType };
}
