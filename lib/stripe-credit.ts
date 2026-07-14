import { createClient } from '@supabase/supabase-js';
import { supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';

export async function creditStripeTopup(
  userId: string,
  amountCents: number,
  sessionId: string,
): Promise<{ credited: boolean; balance_cents: number }> {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant sur Vercel — le webhook ne peut pas créditer le portefeuille.');
  }
  if (amountCents < 50 || amountCents > 50000) {
    throw new Error('Montant invalide');
  }

  const client = createClient(supabaseUrl, supabaseServiceRoleKey);

  const { data: existing } = await client
    .from('wallet_transactions')
    .select('id')
    .eq('user_id', userId)
    .eq('description', `stripe:${sessionId}`)
    .maybeSingle();

  const { data: wallet } = await client.from('wallets').select('*').eq('user_id', userId).maybeSingle();

  if (existing) {
    return { credited: false, balance_cents: wallet?.balance_cents ?? 0 };
  }

  const newBalance = (wallet?.balance_cents ?? 0) + amountCents;

  const { error: walletErr } = await client.from('wallets').upsert({
    user_id: userId,
    balance_cents: newBalance,
    pending_cents: wallet?.pending_cents ?? 0,
  });
  if (walletErr) throw new Error(walletErr.message);

  const { error: txErr } = await client.from('wallet_transactions').insert({
    user_id: userId,
    type: 'topup_stripe',
    amount_cents: amountCents,
    description: `stripe:${sessionId}`,
  });
  if (txErr) throw new Error(txErr.message);

  return { credited: true, balance_cents: newBalance };
}