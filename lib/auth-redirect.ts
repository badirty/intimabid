const PRODUCTION_URL = 'https://badirty.fr';

/** URL de retour OAuth — doit être listée dans Supabase → Auth → URL Configuration */
export function getAuthRedirectUrl(): string {
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? PRODUCTION_URL).replace(/\/$/, '');

  if (typeof window === 'undefined') {
    return `${siteUrl}/auth/callback`;
  }

  const origin = window.location.hostname === 'localhost'
    ? siteUrl
    : window.location.origin;

  return `${origin}/auth/callback`;
}