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

function createIndividualExpressAccount(stripe: Stripe, email?: string) {
  return stripe.accounts.create({
    type: 'express',
    country: 'FR',
    email,
    business_type: 'individual',
    capabilities: {
      transfers: { requested: true },
    },
    individual: {
      email,
    },
    business_profile: {
      product_description: 'Ventes entre particuliers sur badirty',
      mcc: '5931',
      url: siteUrl,
    },
    settings: {
      payouts: {
        schedule: { interval: 'daily' },
      },
    },
    metadata: {
      platform: 'badirty',
      account_kind: 'individual',
    },
  });
}

/**
 * Anciens comptes créés avant le fix (souvent company / type vide) :
 * on ne les garde QUE s'ils sont déjà en `individual`.
 * Un compte société avec des infos déjà saisies bloquait le flux — d'où
 * le bug "on me demande encore l'état de ma société".
 */
function shouldRecreateAsIndividual(account: Stripe.Account, forceReset = false): boolean {
  if (forceReset) return true;
  // Déjà particulier → on continue l'onboarding / le compte existant
  if (account.business_type === 'individual') return false;
  // Société (ou type inconnu) avec retraits déjà actifs : rare, on laisse
  if (account.payouts_enabled && account.business_type === 'company') return false;
  // Sinon : company, null, ou partiellement rempli → nouveau compte particulier
  return true;
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
 * Garantit un compte Connect Express **particulier** lié au profil.
 * Remplace les anciens comptes société (même si des infos avaient été saisies).
 */
export async function ensureIndividualConnectAccount(
  user: ResolvedUser,
  opts?: { forceReset?: boolean },
): Promise<{ accountId: string; stripe: Stripe; recreated: boolean }> {
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

  if (accountId) {
    try {
      const existing = await stripe.accounts.retrieve(accountId);
      if (shouldRecreateAsIndividual(existing, forceReset)) {
        previousAccountId = accountId;
        accountId = undefined;
        recreated = true;
        console.info(
          '[stripe-connect] recreate as individual',
          {
            userId: user.id,
            previous: previousAccountId,
            wasType: existing.business_type,
            details_submitted: existing.details_submitted,
            forceReset,
          },
        );
      }
    } catch {
      previousAccountId = accountId;
      accountId = undefined;
      recreated = true;
    }
  }

  if (!accountId) {
    const account = await createIndividualExpressAccount(stripe, user.email ?? undefined);
    accountId = account.id;
    await persistConnectAccountId(user.id, accountId, supabase);

    // Ancien compte orphelin (Express) : on tente une suppression soft, non bloquante
    if (previousAccountId) {
      try {
        await stripe.accounts.del(previousAccountId);
      } catch {
        /* Express non toujours supprimable — ignore */
      }
    }
  }

  return { accountId, stripe, recreated };
}
