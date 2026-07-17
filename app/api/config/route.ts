import { NextResponse } from 'next/server';
import { stripeConfigStatus } from '@/lib/env';

export async function GET() {
  const stripe = stripeConfigStatus();
  return NextResponse.json({
    stripe: stripe.configured,
    stripeMissing: stripe.missing,
  });
}