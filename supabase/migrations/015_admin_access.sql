-- Accès administrateur

-- Flag admin sur les profils
alter table public.profiles
  add column if not exists is_admin boolean not null default false,
  add column if not exists suspended_at timestamptz;

-- Index utiles pour l'admin
 create index if not exists idx_profiles_admin on public.profiles(is_admin);
 create index if not exists idx_profiles_suspended on public.profiles(suspended_at);

-- Politiques RLS pour les administrateurs
-- Reports : lecture/admin pour les admins
drop policy if exists "reports read admin" on public.reports;
create policy "reports read admin" on public.reports
  for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Reports : suppression/admin pour les admins
drop policy if exists "reports delete admin" on public.reports;
create policy "reports delete admin" on public.reports
  for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Profiles : lecture complète pour les admins
drop policy if exists "profiles read admin" on public.profiles;
create policy "profiles read admin" on public.profiles
  for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Profiles : mise à jour par un admin (suspension, etc.)
drop policy if exists "profiles update admin" on public.profiles;
create policy "profiles update admin" on public.profiles
  for update
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Auctions : lecture/admin (déjà public, mais explicite)
drop policy if exists "auctions read admin" on public.auctions;
create policy "auctions read admin" on public.auctions
  for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Auctions : suppression/admin pour les admins
drop policy if exists "auctions delete admin" on public.auctions;
create policy "auctions delete admin" on public.auctions
  for delete
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Wallets : lecture/admin pour les admins
drop policy if exists "wallets read admin" on public.wallets;
create policy "wallets read admin" on public.wallets
  for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Withdrawal requests : lecture/admin pour les admins
drop policy if exists "withdrawals read admin" on public.withdrawal_requests;
create policy "withdrawals read admin" on public.withdrawal_requests
  for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Notifications : lecture/admin pour les admins
drop policy if exists "notifications read admin" on public.notifications;
create policy "notifications read admin" on public.notifications
  for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Orders : lecture/admin pour les admins
drop policy if exists "orders read admin" on public.orders;
create policy "orders read admin" on public.orders
  for select
  using (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));

-- Fonction utilitaire pour promouvoir un utilisateur en admin via son email.
-- Après avoir déployé cette migration, exécute dans Supabase SQL Editor :
--   select promote_user_to_admin('admin@badirty.fr');
-- Cela définit profiles.is_admin = true pour l'utilisateur avec cet email.
create or replace function public.promote_user_to_admin(p_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = p_email limit 1;
  if v_user_id is null then
    raise exception 'Utilisateur avec l''email % non trouvé', p_email;
  end if;

  insert into public.profiles (id, display_name, is_admin)
  values (v_user_id, split_part(p_email, '@', 1), true)
  on conflict (id) do update set is_admin = true;
end;
$$;
