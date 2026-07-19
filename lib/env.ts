/** Lit la première variable d'environnement définie (tolère les typos Vercel).
 *  ⚠️ Réservé aux variables SERVEUR (pas de NEXT_PUBLIC_*) car Next.js
 *  ne peut pas inliner les accès dynamiques process.env[key] au build. */
export function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value) return value;
  }
  return undefined;
}

// ── Variables NEXT_PUBLIC_* (client) : accès STATIQUE obligatoire ──
// Next.js inline ces valeurs au build uniquement si l'accès est explicite
// (dot notation ou bracket avec chaîne littérale).

export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

function publicEnvError(name: string): never {
  const msg =
    process.env.NODE_ENV === 'development'
      ? `${name} manquante — copie .env.local.example vers .env.local`
      : `${name} manquante — configure-la sur Vercel`;
  throw new Error(msg);
}

if (!supabaseUrl) publicEnvError('NEXT_PUBLIC_SUPABASE_URL');

export const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.NEXT_PUBLIC_SU_BASE_ANON_KEY ??
  '';

/** Vérifie que la clé anon est bien configurée (appelé côté client après hydratation). */
export function ensureAnonKey(): string {
  if (!supabaseAnonKey) {
    publicEnvError('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  return supabaseAnonKey;
}

export const stripePublishableKey =
  process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_ST_BLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_STRIPE_KEY;

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://badirty.fr';

export const stripeSecretKey = readEnv(
  'STRIPE_SECRET_KEY',
  'STRIPE_SK',
);

export const stripeWebhookSecret = readEnv('STRIPE_WEBHOOK_SECRET');

export const supabaseServiceRoleKey = readEnv('SUPABASE_SERVICE_ROLE_KEY');

export const adminEmail = readEnv('ADMIN_EMAIL') ?? 'admin@badirty.fr';

export function signupBonusCents(): number {
  return 0;
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

export function isAdminEmail(email?: string | null): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === adminEmail.toLowerCase().trim();
}