import { createBrowserClient } from '@supabase/ssr';
import { supabaseUrl, ensureAnonKey } from './env';

export function createClient() {
  const key = ensureAnonKey();
  return createBrowserClient(supabaseUrl, key);
}