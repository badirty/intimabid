/** Lit la première variable d'environnement définie (tolère les typos Vercel). */
export function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}

export const supabaseUrl =
  readEnv('NEXT_PUBLIC_SUPABASE_URL') ?? 'https://cmtijlciwosbpzokndnp.supabase.co';

export const supabaseAnonKey =
  readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SU_BASE_ANON_KEY') ??
  'sb_publishable_uwJf933WxGLlYhT3h7I8pw_-eEUoDRq';

export const stripePublishableKey = readEnv(
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_ST_BLISHABLE_KEY',
);

export const stripeSecretKey = readEnv('STRIPE_SECRET_KEY');

export const stripeWebhookSecret = readEnv('STRIPE_WEBHOOK_SECRET');

export const supabaseServiceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

export const siteUrl = readEnv('NEXT_PUBLIC_SITE_URL') ?? 'https://badirty.fr';

export function isStripeConfigured(): boolean {
  return Boolean(stripeSecretKey && stripePublishableKey);
}