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

function shouldRecreateAsIndividual(account: Stripe.Account): boolean {
  if (account.payouts_enabled || account.details_submitted) return false;
  return account.business_type !== 'individual';
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

/**
 * Garantit un compte Connect Express **particulier** lié au profil.
 * Recrée le compte s'il était bloqué en parcours société (non finalisé).
 */
export async function ensureIndividualConnectAccount(
  user: ResolvedUser,
): Promise<{ accountId: string; stripe: Stripe }> {
  if (!stripeSecretKey) {
    throw new Error('Stripe non configuré');
  }

  const stripe = new Stripe(stripeSecretKey);
  const supabase = await createServerSupabase();

  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_connect_id')
    .eq('id', user.id)
    .maybeSingle();

  let accountId = profile?.stripe_connect_id as string | undefined;

  if (accountId) {
    try {
      const existing = await stripe.accounts.retrieve(accountId);
      if (shouldRecreateAsIndividual(existing)) {
        accountId = undefined;
      }
    } catch {
      accountId = undefined;
    }
  }

  if (!accountId) {
    const account = await createIndividualExpressAccount(stripe, user.email ?? undefined);
    accountId = account.id;

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, stripe_connect_id: accountId }, { onConflict: 'id' });

    if (error) {
      if (!supabaseServiceRoleKey) throw new Error(error.message);
      const admin = createClient(supabaseUrl, supabaseServiceRoleKey);
      const { error: adminErr } = await admin
        .from('profiles')
        .upsert({ id: user.id, stripe_connect_id: accountId }, { onConflict: 'id' });
      if (adminErr) throw new Error(adminErr.message);
    }
  }

  return { accountId, stripe };
}
