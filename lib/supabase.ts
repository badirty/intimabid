import { createClient } from '@/lib/supabase/client';

/** Client navigateur — PKCE stocké en cookies via @supabase/ssr */
export const supabase = createClient();