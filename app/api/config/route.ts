import { NextResponse } from 'next/server';
import { isDemoWalletEnabled, stripeConfigStatus } from '@/lib/env';

export async function GET() {
  const stripe = stripeConfigStatus();
  return NextResponse.json({
    stripe: stripe.configured,
    demoWallet: isDemoWalletEnabled(),
    stripeMissing: stripe.missing,
  });
}