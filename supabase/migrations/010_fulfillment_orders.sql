-- Commandes post-vente + adresses + signalements

create table if not exists public.user_addresses (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  line1 text not null,
  line2 text,
  city text not null,
  postal_code text not null,
  country text not null default 'FR',
  updated_at timestamptz default now() not null
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  auction_id uuid not null unique references public.auctions(id) on delete cascade,
  buyer_id uuid not null references auth.users(id) on delete cascade,
  seller_id uuid not null references auth.users(id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  status text not null default 'pending_address'
    check (status in ('pending_address', 'awaiting_shipment', 'shipped', 'delivered', 'cancelled')),
  shipping_full_name text,
  shipping_line1 text,
  shipping_line2 text,
  shipping_city text,
  shipping_postal_code text,
  shipping_country text default 'FR',
  tracking_number text,
  shipped_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz default now() not null
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references auth.users(id) on delete cascade,
  auction_id uuid references public.auctions(id) on delete set null,
  reason text not null,
  details text,
  created_at timestamptz default now() not null
);

alter table public.profiles
  add column if not exists age_confirmed_at timestamptz,
  add column if not exists stripe_connect_id text;

create index if not exists idx_orders_buyer on public.orders(buyer_id, created_at desc);
create index if not exists idx_orders_seller on public.orders(seller_id, status, created_at desc);

alter table public.user_addresses enable row level security;
alter table public.orders enable row level security;
alter table public.reports enable row level security;

create policy "addresses own" on public.user_addresses for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "orders read party" on public.orders for select using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "orders update party" on public.orders for update using (auth.uid() = buyer_id or auth.uid() = seller_id);
create policy "reports insert own" on public.reports for insert with check (auth.uid() = reporter_id);

create or replace function public.create_order_for_sold_auction(p_auction_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_a public.auctions%rowtype;
begin
  select * into v_a from public.auctions where id = p_auction_id;
  if not found or v_a.status != 'sold' or v_a.winner_id is null then return end if;
  insert into public.orders (auction_id, buyer_id, seller_id, amount_cents, status)
  values (v_a.id, v_a.winner_id, v_a.seller_id, v_a.current_price_cents, 'pending_address')
  on conflict (auction_id) do nothing;

  insert into public.notifications (user_id, type, title, body, auction_id)
  values (
    v_a.winner_id, 'won', 'Tu as gagné ! 🎉',
    'Ajoute ton adresse pour recevoir « ' || v_a.title || ' »',
    v_a.id
  );
  insert into public.notifications (user_id, type, title, body, auction_id)
  values (
    v_a.seller_id, 'sale', 'Vente à expédier',
    'Prépare l''envoi de « ' || v_a.title || ' »',
    v_a.id
  );
end;
$$;

create or replace function public.close_expired_auctions()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select id from public.auctions
    where status = 'live' and ends_at < now()
  loop
    update public.auctions
    set status = case when winner_id is not null then 'sold' else 'ended' end
    where id = r.id;
    perform public.create_order_for_sold_auction(r.id);
  end loop;
end;
$$;

create or replace function public.buy_now(p_auction_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_a public.auctions%rowtype;
  v_price integer;
  v_bal integer;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  perform public.close_expired_auctions();

  select * into v_a from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Enchère introuvable'; end if;
  if v_a.status != 'live' then raise exception 'Enchère terminée'; end if;
  if v_a.ends_at < now() then raise exception 'Enchère expirée'; end if;
  if v_a.buy_now_price_cents is null then raise exception 'Achat immédiat non disponible'; end if;
  if v_a.seller_id = v_user then raise exception 'Tu ne peux pas acheter ta propre vente'; end if;

  v_price := v_a.buy_now_price_cents;

  select balance_cents into v_bal from public.wallets where user_id = v_user for update;
  if v_bal is null or v_bal < v_price then
    raise exception 'Solde insuffisant — recharge ton portefeuille';
  end if;

  if v_a.winner_id is not null and v_a.winner_id != v_user then
    update public.wallets set balance_cents = balance_cents + v_a.current_price_cents, updated_at = now()
    where user_id = v_a.winner_id;
    insert into public.wallet_transactions (user_id, type, amount_cents, description)
    values (v_a.winner_id, 'bid_refund', v_a.current_price_cents, 'Remboursement surenchère');
  end if;

  update public.wallets set balance_cents = balance_cents - v_price, updated_at = now()
  where user_id = v_user;
  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_user, 'bid_hold', -v_price, 'Achat immédiat');

  insert into public.bids (auction_id, bidder_id, amount_cents) values (p_auction_id, v_user, v_price);
  update public.auctions
    set current_price_cents = v_price, winner_id = v_user, status = 'sold', ends_at = now()
    where id = p_auction_id;

  perform public.create_order_for_sold_auction(p_auction_id);

  insert into public.notifications (user_id, type, title, body, auction_id)
  values (
    v_a.seller_id, 'sold', 'Article vendu !',
    'Achat immédiat à ' || (v_price::numeric / 100) || ' € sur « ' || v_a.title || ' »',
    p_auction_id
  );

  return json_build_object('ok', true, 'amount_cents', v_price);
end;
$$;

create or replace function public.save_shipping_address(
  p_full_name text, p_line1 text, p_line2 text, p_city text, p_postal text, p_country text default 'FR'
)
returns void language plpgsql security definer set search_path = public as $$
declare v_user uuid := auth.uid();
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  insert into public.user_addresses (user_id, full_name, line1, line2, city, postal_code, country)
  values (v_user, p_full_name, p_line1, nullif(p_line2, ''), p_city, p_postal, coalesce(p_country, 'FR'))
  on conflict (user_id) do update set
    full_name = excluded.full_name, line1 = excluded.line1, line2 = excluded.line2,
    city = excluded.city, postal_code = excluded.postal_code, country = excluded.country,
    updated_at = now();
end;
$$;

create or replace function public.submit_order_address(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_o public.orders%rowtype;
  v_a public.user_addresses%rowtype;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if v_o.buyer_id != v_user then raise exception 'Non autorisé'; end if;
  select * into v_a from public.user_addresses where user_id = v_user;
  if not found then raise exception 'Ajoute d''abord ton adresse'; end if;

  update public.orders set
    status = 'awaiting_shipment',
    shipping_full_name = v_a.full_name,
    shipping_line1 = v_a.line1,
    shipping_line2 = v_a.line2,
    shipping_city = v_a.city,
    shipping_postal_code = v_a.postal_code,
    shipping_country = v_a.country
  where id = p_order_id;

  insert into public.notifications (user_id, type, title, body, auction_id)
  values (v_o.seller_id, 'ship', 'Adresse reçue', 'Expédie la commande pour cette vente', v_o.auction_id);
end;
$$;

create or replace function public.mark_order_shipped(p_order_id uuid, p_tracking text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_o public.orders%rowtype;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if v_o.seller_id != v_user then raise exception 'Non autorisé'; end if;
  if v_o.status not in ('awaiting_shipment', 'pending_address') then raise exception 'Statut invalide'; end if;

  update public.orders set
    status = 'shipped',
    tracking_number = nullif(p_tracking, ''),
    shipped_at = now()
  where id = p_order_id;

  insert into public.notifications (user_id, type, title, body, auction_id)
  values (
    v_o.buyer_id, 'shipped', 'Colis expédié 📦',
    coalesce('Suivi : ' || p_tracking, 'Ton vendeur a expédié ta commande'),
    v_o.auction_id
  );
end;
$$;

create or replace function public.confirm_order_delivered(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_o public.orders%rowtype;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if v_o.buyer_id != v_user then raise exception 'Non autorisé'; end if;
  update public.orders set status = 'delivered', delivered_at = now() where id = p_order_id;
end;
$$;