import { createClient } from '@supabase/supabase-js';
import { adminEmail, supabaseServiceRoleKey, supabaseUrl } from '@/lib/env';

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === adminEmail.toLowerCase().trim();
}

export type AdminClient = ReturnType<typeof createAdminClient>;

export function createAdminClient() {
  if (!supabaseServiceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY manquante — requête admin impossible');
  }
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function isUserSuspendedService(admin: AdminClient, userId: string): Promise<boolean> {
  const { data } = await admin.from('profiles').select('suspended_at').eq('id', userId).maybeSingle();
  return !!data?.suspended_at;
}

export async function assertNotSuspended(admin: AdminClient, userId: string): Promise<void> {
  const suspended = await isUserSuspendedService(admin, userId);
  if (suspended) {
    throw new Error('Compte suspendu');
  }
}

export type AdminStats = {
  users_count: number;
  auctions_count: number;
  live_auctions_count: number;
  sold_auctions_count: number;
  orders_count: number;
  pending_withdrawals_count: number;
  reports_count: number;
};

export type AdminReport = {
  id: string;
  reporter_id: string;
  reporter_email: string | null;
  reporter_name: string | null;
  auction_id: string | null;
  reason: string;
  details: string | null;
  created_at: string;
};

export type AdminUser = {
  id: string;
  email: string | null;
  display_name: string | null;
  created_at: string | null;
  suspended_at: string | null;
  balance_cents: number;
};

export type AdminAuction = {
  id: string;
  seller_id: string;
  seller_email: string | null;
  title: string;
  status: string;
  current_price_cents: number;
  created_at: string;
};

export type AdminWithdrawal = {
  id: string;
  user_id: string;
  user_email: string | null;
  amount_cents: number;
  status: string;
  created_at: string;
};
