-- Crédit vendeur à la vente (manquait dans buy_now + clôture enchères)
-- L'acheteur était débité (bid_hold) mais le seller ne recevait jamais sale_credit.

create or replace function public.credit_seller_for_sale(p_auction_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_a public.auctions%rowtype;
  v_desc text;
  v_exists boolean;
begin
  select * into v_a from public.auctions where id = p_auction_id;
  if not found then return; end if;
  if v_a.status != 'sold' or v_a.winner_id is null then return; end if;
  if v_a.current_price_cents is null or v_a.current_price_cents <= 0 then return; end if;

  v_desc := 'sale:' || p_auction_id::text;

  select exists(
    select 1 from public.wallet_transactions
    where user_id = v_a.seller_id
      and type = 'sale_credit'
      and description = v_desc
  ) into v_exists;

  if v_exists then return; end if;

  insert into public.wallets (user_id, balance_cents, pending_cents)
  values (v_a.seller_id, 0, 0)
  on conflict (user_id) do nothing;

  update public.wallets
  set balance_cents = balance_cents + v_a.current_price_cents,
      updated_at = now()
  where user_id = v_a.seller_id;

  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (
    v_a.seller_id,
    'sale_credit',
    v_a.current_price_cents,
    v_desc
  );
end;
$$;

-- Achat immédiat : débiter acheteur + créditer vendeur
create or replace function public.buy_now(p_auction_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_a public.auctions%rowtype;
  v_price integer;
  v_bal integer;
  v_price_label text;
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
  v_price_label := to_char(round(v_price / 100.0, 2), 'FM999999990.00');

  select balance_cents into v_bal from public.wallets where user_id = v_user for update;
  if v_bal is null or v_bal < v_price then
    raise exception 'Solde insuffisant — recharge ton portefeuille';
  end if;

  -- Rembourse l'ancien meilleur enchérisseur
  if v_a.winner_id is not null and v_a.winner_id != v_user then
    update public.wallets set balance_cents = balance_cents + v_a.current_price_cents, updated_at = now()
    where user_id = v_a.winner_id;
    insert into public.wallet_transactions (user_id, type, amount_cents, description)
    values (v_a.winner_id, 'bid_refund', v_a.current_price_cents, 'Remboursement surenchère');
  end if;

  -- Débit acheteur
  update public.wallets set balance_cents = balance_cents - v_price, updated_at = now()
  where user_id = v_user;
  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_user, 'bid_hold', -v_price, 'Achat immédiat');

  insert into public.bids (auction_id, bidder_id, amount_cents) values (p_auction_id, v_user, v_price);
  update public.auctions
    set current_price_cents = v_price, winner_id = v_user, status = 'sold', ends_at = now()
    where id = p_auction_id;

  -- Crédit vendeur (manquait avant)
  perform public.credit_seller_for_sale(p_auction_id);

  perform public.create_order_for_sold_auction(p_auction_id);

  insert into public.notifications (user_id, type, title, body, auction_id)
  values (
    v_a.seller_id, 'sold', 'Article vendu !',
    'Achat immédiat à ' || v_price_label || ' € sur « ' || v_a.title || ' »',
    p_auction_id
  );

  return json_build_object('ok', true, 'amount_cents', v_price);
end;
$$;

-- Clôture auto : crédite le vendeur quand l'enchère expire avec un gagnant
create or replace function public.close_expired_auctions()
returns void language plpgsql security definer set search_path = public as $$
declare r record;
begin
  for r in
    select id, winner_id from public.auctions
    where status = 'live' and ends_at < now()
  loop
    update public.auctions
    set status = case when winner_id is not null then 'sold' else 'ended' end
    where id = r.id;

    if r.winner_id is not null then
      perform public.credit_seller_for_sale(r.id);
      perform public.create_order_for_sold_auction(r.id);
    end if;
  end loop;
end;
$$;

-- Commande post-vente style Vinted :
-- 1) si l'acheteur a déjà une adresse → commande « à expédier » tout de suite
-- 2) sinon → pending_address (l'acheteur doit la renseigner)
create or replace function public.create_order_for_sold_auction(p_auction_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_a public.auctions%rowtype;
  v_addr public.user_addresses%rowtype;
  v_status text;
  v_price_label text;
begin
  select * into v_a from public.auctions where id = p_auction_id;
  if not found or v_a.status != 'sold' or v_a.winner_id is null then
    return;
  end if;

  -- Déjà une commande ? on ne notifie pas en double
  if exists (select 1 from public.orders where auction_id = p_auction_id) then
    return;
  end if;

  v_price_label := to_char(round(v_a.current_price_cents / 100.0, 2), 'FM999999990.00');
  select * into v_addr from public.user_addresses where user_id = v_a.winner_id;

  if found then
    v_status := 'awaiting_shipment';
    insert into public.orders (
      auction_id, buyer_id, seller_id, amount_cents, status,
      shipping_full_name, shipping_line1, shipping_line2,
      shipping_city, shipping_postal_code, shipping_country
    ) values (
      v_a.id, v_a.winner_id, v_a.seller_id, v_a.current_price_cents, v_status,
      v_addr.full_name, v_addr.line1, v_addr.line2,
      v_addr.city, v_addr.postal_code, v_addr.country
    );

    insert into public.notifications (user_id, type, title, body, auction_id)
    values (
      v_a.winner_id, 'won', 'Achat confirmé 🎉',
      'Le vendeur prépare l''envoi de « ' || v_a.title || ' » (' || v_price_label || ' €)',
      v_a.id
    );
    insert into public.notifications (user_id, type, title, body, auction_id)
    values (
      v_a.seller_id, 'sale', 'À expédier 📦',
      'Adresse de l''acheteur prête pour « ' || v_a.title || ' » — vois Commandes → Expéditions',
      v_a.id
    );
  else
    v_status := 'pending_address';
    insert into public.orders (auction_id, buyer_id, seller_id, amount_cents, status)
    values (v_a.id, v_a.winner_id, v_a.seller_id, v_a.current_price_cents, v_status);

    insert into public.notifications (user_id, type, title, body, auction_id)
    values (
      v_a.winner_id, 'won', 'Indique ton adresse 📍',
      'Pour recevoir « ' || v_a.title || ' », ouvre Commandes → Achats et valide ton adresse',
      v_a.id
    );
    insert into public.notifications (user_id, type, title, body, auction_id)
    values (
      v_a.seller_id, 'sale', 'Vente en attente d''adresse',
      '« ' || v_a.title || ' » est vendu — l''acheteur doit encore indiquer où livrer (Commandes → Expéditions)',
      v_a.id
    );
  end if;
end;
$$;

-- Notif vendeur plus claire quand l'adresse arrive
create or replace function public.submit_order_address(p_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_o public.orders%rowtype;
  v_a public.user_addresses%rowtype;
  v_title text;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  select * into v_o from public.orders where id = p_order_id for update;
  if not found then raise exception 'Commande introuvable'; end if;
  if v_o.buyer_id != v_user then raise exception 'Non autorisé'; end if;
  if v_o.status != 'pending_address' then raise exception 'Adresse déjà validée'; end if;

  select * into v_a from public.user_addresses where user_id = v_user;
  if not found then raise exception 'Ajoute d''abord ton adresse ci-dessus'; end if;

  update public.orders set
    status = 'awaiting_shipment',
    shipping_full_name = v_a.full_name,
    shipping_line1 = v_a.line1,
    shipping_line2 = v_a.line2,
    shipping_city = v_a.city,
    shipping_postal_code = v_a.postal_code,
    shipping_country = v_a.country
  where id = p_order_id;

  select title into v_title from public.auctions where id = v_o.auction_id;

  insert into public.notifications (user_id, type, title, body, auction_id)
  values (
    v_o.seller_id, 'ship', 'Adresse reçue — à expédier 📦',
    'Expédie « ' || coalesce(v_title, 'la commande') || ' » : ouvre Commandes → Expéditions pour voir l''adresse',
    v_o.auction_id
  );
end;
$$;

-- Rattrapage : ventes déjà sold sans sale_credit vendeur
do $$
declare r record;
begin
  for r in
    select a.id
    from public.auctions a
    where a.status = 'sold'
      and a.winner_id is not null
      and a.current_price_cents > 0
      and not exists (
        select 1 from public.wallet_transactions wt
        where wt.user_id = a.seller_id
          and wt.type = 'sale_credit'
          and wt.description = 'sale:' || a.id::text
      )
  loop
    perform public.credit_seller_for_sale(r.id);
  end loop;
end;
$$;
