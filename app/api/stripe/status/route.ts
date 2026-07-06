import { NextResponse } from 'next/server';
import { isStripeConfigured } from '@/lib/env';

/** @deprecated Préfère GET /api/config */
export async function GET() {
  return NextResponse.json({ enabled: isStripeConfigured() });
}