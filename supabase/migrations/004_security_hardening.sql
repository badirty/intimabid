-- Sécurité prod : profils privés, pas de bonus auto, recharge démo off par défaut

-- 1. Profils : plus de lecture publique globale
drop policy if exists "profiles read all" on public.profiles;
drop policy if exists "profiles read own" on public.profiles;
drop policy if exists "profiles read sellers" on public.profiles;

create policy "profiles read own" on public.profiles
  for select using (auth.uid() = id);

-- Pseudos des vendeurs avec enchères (utilisateurs connectés uniquement)
create policy "profiles read sellers" on public.profiles
  for select using (
    auth.uid() is not null
    and exists (
      select 1 from public.auctions a
      where a.seller_id = profiles.id
        and a.status in ('live', 'ended', 'sold')
    )
  );

-- 2. Bonus inscription : 0 €
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'user'));
  insert into public.wallets (user_id, balance_cents) values (new.id, 0);
  return new;
end;
$$;

-- 3. Flag serveur recharge démo (false = prod)
create table if not exists public.app_settings (
  key text primary key,
  value boolean not null default false
);

alter table public.app_settings enable row level security;

insert into public.app_settings (key, value)
values ('demo_wallet_enabled', false)
on conflict (key) do update set value = excluded.value;

-- 4. Recharge démo : bloquée sauf si app_settings.demo_wallet_enabled = true
create or replace function public.demo_wallet_topup(p_amount_cents integer default 5000)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_demo boolean;
  v_new_balance integer;
begin
  select coalesce(value, false) into v_demo
  from public.app_settings where key = 'demo_wallet_enabled';

  if not v_demo then
    raise exception 'Recharge démo désactivée';
  end if;

  if v_user is null then raise exception 'Non connecté'; end if;
  if p_amount_cents < 100 or p_amount_cents > 50000 then
    raise exception 'Montant invalide (1€ – 500€)';
  end if;

  insert into public.wallets (user_id, balance_cents)
  values (v_user, p_amount_cents)
  on conflict (user_id) do update
    set balance_cents = wallets.balance_cents + excluded.balance_cents,
        updated_at = now()
  returning balance_cents into v_new_balance;

  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_user, 'topup_demo', p_amount_cents, 'Recharge démo');

  return json_build_object('ok', true, 'balance_added', p_amount_cents, 'balance_cents', v_new_balance);
end;
$$;