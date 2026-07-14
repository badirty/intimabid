import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    _client = createClient();
  }
  return _client;
}

/** Proxy qui crée le client Supabase paresseusement (au premier appel). */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getClient(), prop, receiver);
  },
  set(_target, prop, value, receiver) {
    return Reflect.set(getClient(), prop, value, receiver);
  },
});