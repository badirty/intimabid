import { NextResponse } from 'next/server';
import { isStripeConfigured } from '@/lib/env';

export async function GET() {
  return NextResponse.json({ enabled: isStripeConfigured() });
}