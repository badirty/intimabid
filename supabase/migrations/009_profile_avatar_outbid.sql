-- Avatar profil + notification surenchère

alter table public.profiles
  add column if not exists avatar_url text;

create or replace function public.place_bid(p_auction_id uuid, p_amount_cents integer)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_a public.auctions%rowtype;
  v_min integer;
  v_bal integer;
  v_prev_winner uuid;
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

  v_prev_winner := v_a.winner_id;

  if v_prev_winner is not null and v_prev_winner != v_user then
    update public.wallets set balance_cents = balance_cents + v_a.current_price_cents, updated_at = now()
    where user_id = v_prev_winner;
    insert into public.wallet_transactions (user_id, type, amount_cents, description)
    values (v_prev_winner, 'bid_refund', v_a.current_price_cents, 'Remboursement surenchère');

    insert into public.notifications (user_id, type, title, body, auction_id)
    values (
      v_prev_winner, 'outbid', 'Surenéchéri !',
      'Nouvelle offre à ' || (p_amount_cents::numeric / 100) || ' € sur « ' || v_a.title || ' »',
      p_auction_id
    );
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