-- Ajout image_url pour les enchères + bucket Storage
-- Exécuter dans Supabase → SQL Editor

-- 1. Ajouter la colonne image_url
alter table public.auctions
  add column if not exists image_url text;

-- 2. Créer le bucket storage (public)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'auction-images',
  'auction-images',
  true,
  5242880, -- 5 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 3. Policies storage — tout le monde peut lire
drop policy if exists "Tout le monde peut voir les images" on storage.objects;
create policy "Tout le monde peut voir les images"
  on storage.objects for select
  using (bucket_id = 'auction-images');

-- 4. Seuls les utilisateurs connectés peuvent uploader
drop policy if exists "Utilisateurs connectés peuvent uploader" on storage.objects;
create policy "Utilisateurs connectés peuvent uploader"
  on storage.objects for insert
  with check (
    bucket_id = 'auction-images'
    and auth.role() = 'authenticated'
  );

-- 5. Propriétaire peut supprimer son image
drop policy if exists "Propriétaire peut supprimer son image" on storage.objects;
create policy "Propriétaire peut supprimer son image"
  on storage.objects for delete
  using (
    bucket_id = 'auction-images'
    and auth.uid()::text = owner_id::text
  );
