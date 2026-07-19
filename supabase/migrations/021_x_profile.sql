-- Lien X (Twitter) sur le profil + visibilité publique optionnelle

alter table public.profiles
  add column if not exists x_username text,
  add column if not exists x_public boolean not null default false;
