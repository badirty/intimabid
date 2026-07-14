-- Achat immédiat : clôture l'enchère et attribue l'article

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

  insert into public.notifications (user_id, type, title, body, auction_id)
  values (
    v_a.seller_id, 'sold', 'Article vendu !',
    'Achat immédiat à ' || (v_price::numeric / 100) || ' € sur « ' || v_a.title || ' »',
    p_auction_id
  );

  return json_build_object('ok', true, 'amount_cents', v_price);
end;
$$;