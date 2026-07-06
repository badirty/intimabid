/** Lit la première variable d'environnement définie (tolère les typos Vercel). */
export function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}

function requirePublicEnv(...keys: string[]): string {
  const value = readEnv(...keys);
  if (value) return value;
  const names = keys.join(' ou ');
  if (process.env.NODE_ENV === 'development') {
    throw new Error(`${names} manquante — copie .env.local.example vers .env.local`);
  }
  throw new Error(`${names} manquante — configure-la sur Vercel`);
}

export const supabaseUrl =
  readEnv('NEXT_PUBLIC_SUPABASE_URL') ?? 'https://cmtijlciwosbpzokndnp.supabase.co';

export const supabaseAnonKey = requirePublicEnv(
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_SU_BASE_ANON_KEY',
);

export const stripePublishableKey = readEnv(
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_ST_BLISHABLE_KEY',
  'NEXT_PUBLIC_STRIPE_KEY',
);

export const stripeSecretKey = readEnv(
  'STRIPE_SECRET_KEY',
  'STRIPE_SK',
);

export const stripeWebhookSecret = readEnv('STRIPE_WEBHOOK_SECRET');

export const supabaseServiceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

export const siteUrl = readEnv('NEXT_PUBLIC_SITE_URL') ?? 'https://badirty.fr';

/** Recharge démo + bonus inscription — uniquement si explicitement activé (local). */
export function isDemoWalletEnabled(): boolean {
  return readEnv('DEMO_WALLET_ENABLED', 'NEXT_PUBLIC_DEMO_WALLET_ENABLED') === 'true';
}

export function signupBonusCents(): number {
  return isDemoWalletEnabled() ? 2000 : 0;
}

export function stripeConfigStatus(): { configured: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!stripeSecretKey) missing.push('STRIPE_SECRET_KEY');
  if (!stripePublishableKey) missing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  return { configured: missing.length === 0, missing };
}

export function isStripeConfigured(): boolean {
  return stripeConfigStatus().configured;
}