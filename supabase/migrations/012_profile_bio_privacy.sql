-- Bio profil (OAuth X/Google) + visibilité publique optionnelle

alter table public.profiles
  add column if not exists bio text,
  add column if not exists bio_public boolean not null default false;