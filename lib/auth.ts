import type { User } from '@supabase/supabase-js';
import type { PreferredMode, AppMode } from './types';

export function hasCompletedOnboarding(user: User): boolean {
  if (user.user_metadata?.onboarding_completed === true) return true;
  const role = user.user_metadata?.role;
  return role === 'buyer' || role === 'seller';
}

export function getPreferredMode(user: User): PreferredMode {
  const mode = user.user_metadata?.preferred_mode;
  if (mode === 'buyer' || mode === 'seller' || mode === 'both') return mode;
  if (user.user_metadata?.role === 'seller') return 'seller';
  return 'buyer';
}

export function getInitialAppMode(preferred: PreferredMode): AppMode {
  return preferred === 'seller' ? 'seller' : 'buyer';
}