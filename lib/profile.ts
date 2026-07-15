import type { User } from '@supabase/supabase-js';

export function resolveProfileFromUser(user: Pick<User, 'email' | 'user_metadata'>) {
  const meta = user.user_metadata ?? {};
  const avatarUrl =
    (typeof meta.avatar_url === 'string' && meta.avatar_url) ||
    (typeof meta.picture === 'string' && meta.picture) ||
    null;
  const oauthName =
    (typeof meta.full_name === 'string' && meta.full_name) ||
    (typeof meta.name === 'string' && meta.name) ||
    (typeof meta.user_name === 'string' && meta.user_name) ||
    (typeof meta.preferred_username === 'string' && meta.preferred_username) ||
    null;
  const emailName = user.email?.split('@')[0] ?? 'user';

  return {
    display_name: oauthName ?? emailName,
    avatar_url: avatarUrl,
  };
}