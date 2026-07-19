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
  const oauthBio =
    (typeof meta.description === 'string' && meta.description.trim()) ||
    (typeof meta.bio === 'string' && meta.bio.trim()) ||
    (typeof meta.about === 'string' && meta.about.trim()) ||
    null;

  const oauthXUsername =
    (typeof meta.user_name === 'string' && meta.user_name.trim()) ||
    (typeof meta.screen_name === 'string' && meta.screen_name.trim()) ||
    (typeof meta.preferred_username === 'string' && meta.preferred_username.trim()) ||
    null;

  return {
    display_name: oauthName ?? emailName,
    avatar_url: avatarUrl,
    bio: oauthBio,
    x_username: oauthXUsername,
  };
}