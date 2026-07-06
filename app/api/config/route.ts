import { NextResponse } from 'next/server';
import { isDemoWalletEnabled, isStripeConfigured } from '@/lib/env';

export async function GET() {
  return NextResponse.json({
    stripe: isStripeConfigured(),
    demoWallet: isDemoWalletEnabled(),
  });
}