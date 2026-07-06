-- badirty — exécuter dans Supabase → SQL Editor → Run

-- Profiles
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now() not null
);

-- Portefeuille
create table if not exists public.wallets (
  user_id uuid primary key references auth.users(id) on delete cascade,
  balance_cents integer not null default 0 check (balance_cents >= 0),
  pending_cents integer not null default 0 check (pending_cents >= 0),
  updated_at timestamptz default now() not null
);

create table if not exists public.wallet_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('topup_demo', 'topup_stripe', 'bid_hold', 'bid_refund', 'sale_credit', 'withdrawal', 'purchase')),
  amount_cents integer not null,
  description text,
  created_at timestamptz default now() not null
);

-- Enchères
create table if not exists public.auctions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_price_cents integer not null check (start_price_cents > 0),
  current_price_cents integer not null check (current_price_cents > 0),
  bid_increment_cents integer not null default 200,
  status text not null default 'live' check (status in ('live', 'ended', 'sold', 'cancelled')),
  ends_at timestamptz not null,
  image_color text not null default 'from-rose-400 via-pink-300 to-red-400',
  winner_id uuid references auth.users(id),
  created_at timestamptz default now() not null
);

create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null references public.auctions(id) on delete cascade,
  bidder_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  created_at timestamptz default now() not null
);

create table if not exists public.favorites (
  user_id uuid not null references auth.users(id) on delete cascade,
  auction_id uuid not null references public.auctions(id) on delete cascade,
  created_at timestamptz default now() not null,
  primary key (user_id, auction_id)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null,
  title text not null,
  body text,
  read boolean not null default false,
  auction_id uuid references public.auctions(id) on delete set null,
  created_at timestamptz default now() not null
);

create table if not exists public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  created_at timestamptz default now() not null
);

-- Index
create index if not exists idx_auctions_status_ends on public.auctions(status, ends_at desc);
create index if not exists idx_bids_auction on public.bids(auction_id, created_at desc);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

-- Auto-profil + wallet à l'inscription
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(split_part(new.email, '@', 1), 'user'));
  insert into public.wallets (user_id, balance_cents) values (new.id, 2000);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Clôturer les enchères expirées
create or replace function public.close_expired_auctions()
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.auctions
  set status = case when winner_id is not null then 'sold' else 'ended' end
  where status = 'live' and ends_at < now();
end;
$$;

-- Enchérir
create or replace function public.place_bid(p_auction_id uuid, p_amount_cents integer)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_a public.auctions%rowtype;
  v_min integer;
  v_bal integer;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  perform public.close_expired_auctions();

  select * into v_a from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Enchère introuvable'; end if;
  if v_a.status != 'live' then raise exception 'Enchère terminée'; end if;
  if v_a.ends_at < now() then raise exception 'Enchère expirée'; end if;
  if v_a.seller_id = v_user then raise exception 'Tu ne peux pas enchérir sur ta propre vente'; end if;

  v_min := v_a.current_price_cents + v_a.bid_increment_cents;
  if p_amount_cents < v_min then
    raise exception 'Offre minimum : % €', (v_min::numeric / 100);
  end if;

  select balance_cents into v_bal from public.wallets where user_id = v_user for update;
  if v_bal is null or v_bal < p_amount_cents then
    raise exception 'Solde insuffisant — recharge ton portefeuille';
  end if;

  if v_a.winner_id is not null and v_a.winner_id != v_user then
    update public.wallets set balance_cents = balance_cents + v_a.current_price_cents, updated_at = now()
    where user_id = v_a.winner_id;
    insert into public.wallet_transactions (user_id, type, amount_cents, description)
    values (v_a.winner_id, 'bid_refund', v_a.current_price_cents, 'Remboursement surenchère');
  end if;

  update public.wallets set balance_cents = balance_cents - p_amount_cents, updated_at = now()
  where user_id = v_user;
  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_user, 'bid_hold', -p_amount_cents, 'Offre enchère');

  insert into public.bids (auction_id, bidder_id, amount_cents) values (p_auction_id, v_user, p_amount_cents);
  update public.auctions set current_price_cents = p_amount_cents, winner_id = v_user where id = p_auction_id;

  insert into public.notifications (user_id, type, title, body, auction_id)
  values (
    v_a.seller_id, 'bid', 'Nouvelle offre',
    'Offre à ' || (p_amount_cents::numeric / 100) || ' € sur « ' || v_a.title || ' »',
    p_auction_id
  );

  return json_build_object('ok', true, 'amount_cents', p_amount_cents);
end;
$$;

-- Recharge démo (en attendant Stripe)
create or replace function public.demo_wallet_topup(p_amount_cents integer default 5000)
returns json language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  if p_amount_cents < 100 or p_amount_cents > 50000 then
    raise exception 'Montant invalide (1€ – 500€)';
  end if;
  update public.wallets set balance_cents = balance_cents + p_amount_cents, updated_at = now()
  where user_id = v_user;
  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_user, 'topup_demo', p_amount_cents, 'Recharge démo');
  return json_build_object('ok', true, 'balance_added', p_amount_cents);
end;
$$;

-- Demande de retrait
create or replace function public.request_withdrawal(p_amount_cents integer)
returns json language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid(); v_bal integer;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  select balance_cents into v_bal from public.wallets where user_id = v_user for update;
  if v_bal < p_amount_cents then raise exception 'Solde insuffisant'; end if;
  update public.wallets set balance_cents = balance_cents - p_amount_cents, pending_cents = pending_cents + p_amount_cents, updated_at = now()
  where user_id = v_user;
  insert into public.withdrawal_requests (user_id, amount_cents) values (v_user, p_amount_cents);
  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_user, 'withdrawal', -p_amount_cents, 'Demande de retrait');
  return json_build_object('ok', true);
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.auctions enable row level security;
alter table public.bids enable row level security;
alter table public.favorites enable row level security;
alter table public.notifications enable row level security;
alter table public.withdrawal_requests enable row level security;

create policy "profiles read all" on public.profiles for select using (true);
create policy "profiles update own" on public.profiles for update using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);

create policy "wallets read own" on public.wallets for select using (auth.uid() = user_id);
create policy "wallets insert own" on public.wallets for insert with check (auth.uid() = user_id);

create policy "wallet_tx read own" on public.wallet_transactions for select using (auth.uid() = user_id);

create policy "auctions read all" on public.auctions for select using (true);
create policy "auctions insert own" on public.auctions for insert with check (auth.uid() = seller_id);
create policy "auctions update own" on public.auctions for update using (auth.uid() = seller_id);

create policy "bids read all" on public.bids for select using (true);
create policy "bids insert own" on public.bids for insert with check (auth.uid() = bidder_id);

create policy "favorites all own" on public.favorites for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "notifications read own" on public.notifications for select using (auth.uid() = user_id);
create policy "notifications update own" on public.notifications for update using (auth.uid() = user_id);

create policy "withdrawals read own" on public.withdrawal_requests for select using (auth.uid() = user_id);

-- Exemples : ventes terminées (pas de fausses enchères live)
-- Les enchères live seront créées par les vendeurs connectés