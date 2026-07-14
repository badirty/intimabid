import { createBrowserClient } from '@supabase/ssr';
import { supabaseAnonKey, supabaseUrl } from './env';

export function createClient() {
  const url = supabaseUrl || 'https://cmtijlciwosbpzokndnp.supabase.co';
  const key = supabaseAnonKey || '';
  if (!url || !key) {
    throw new Error('Supabase URL ou Anon Key manquante. Verifie les variables d\'environnement sur Vercel.');
  }
  return createBrowserClient(url, key);
}