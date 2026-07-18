-- 020 : Correctif forcé — remplace TOUTES les policies admin par is_admin()
-- La migration 019 a peut-être créé la fonction mais pas appliqué les DROP/CREATE POLICY.
-- On refait tout de manière idempotente.

-- 1. Fonction utilitaire (bypasse RLS grâce à security definer)
create or replace function public.is_admin()
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  return exists (
    select 1 from public.profiles
    where id = auth.uid() and is_admin = true
  );
end;
$$;

-- 2. Mettre à jour toutes les politiques admin pour utiliser is_admin()

-- profiles
drop policy if exists "profiles read admin" on public.profiles;
create policy "profiles read admin" on public.profiles
  for select using (public.is_admin());

drop policy if exists "profiles update admin" on public.profiles;
create policy "profiles update admin" on public.profiles
  for update using (public.is_admin());

-- auctions
drop policy if exists "auctions read admin" on public.auctions;
create policy "auctions read admin" on public.auctions
  for select using (public.is_admin());

drop policy if exists "auctions delete admin" on public.auctions;
create policy "auctions delete admin" on public.auctions
  for delete using (public.is_admin());

-- wallets
drop policy if exists "wallets read admin" on public.wallets;
create policy "wallets read admin" on public.wallets
  for select using (public.is_admin());

-- reports
drop policy if exists "reports read admin" on public.reports;
create policy "reports read admin" on public.reports
  for select using (public.is_admin());

drop policy if exists "reports delete admin" on public.reports;
create policy "reports delete admin" on public.reports
  for delete using (public.is_admin());

-- withdrawal_requests
drop policy if exists "withdrawals read admin" on public.withdrawal_requests;
create policy "withdrawals read admin" on public.withdrawal_requests
  for select using (public.is_admin());

-- notifications
drop policy if exists "notifications read admin" on public.notifications;
create policy "notifications read admin" on public.notifications
  for select using (public.is_admin());

-- orders
drop policy if exists "orders read admin" on public.orders;
create policy "orders read admin" on public.orders
  for select using (public.is_admin());
