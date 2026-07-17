import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isAdminEmail } from '@/lib/admin';

export async function GET() {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return NextResponse.json({ isAdmin: false }, { status: 401 });
  }
  return NextResponse.json({ isAdmin: isAdminEmail(user.email) });
}
