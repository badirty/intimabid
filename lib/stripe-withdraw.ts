import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { stripeSecretKey, supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';

function adminClient() {
  if (!supabaseServiceRoleKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY manquant');
  return createClient(supabaseUrl, supabaseServiceRoleKey);
}

export async function completeWithdrawal(requestId: string, transferId: string) {
  const { error } = await adminClient().rpc('complete_withdrawal', {
    p_request_id: requestId,
    p_stripe_transfer_id: transferId,
  });
  if (error) throw new Error(error.message);
}

export async function rollbackWithdrawal(requestId: string) {
  const { error } = await adminClient().rpc('cancel_withdrawal_request', {
    p_request_id: requestId,
  });
  if (error) throw new Error(error.message);
}

export async function executeStripeWithdrawal(
  connectAccountId: string,
  amountCents: number,
  requestId: string,
  userId: string,
): Promise<string> {
  if (!stripeSecretKey) throw new Error('Stripe non configuré');
  const stripe = new Stripe(stripeSecretKey);

  const transfer = await stripe.transfers.create({
    amount: amountCents,
    currency: 'eur',
    destination: connectAccountId,
    metadata: {
      user_id: userId,
      withdrawal_request_id: requestId,
    },
  });

  await completeWithdrawal(requestId, transfer.id);
  return transfer.id;
}