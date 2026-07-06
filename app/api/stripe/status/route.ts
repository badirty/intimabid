import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    enabled: Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
  });
}