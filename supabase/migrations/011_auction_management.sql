-- Gestion vendeur : annuler, prolonger, éditer

create or replace function public.cancel_auction(p_auction_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_a public.auctions%rowtype;
  v_bid_count integer;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  select * into v_a from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Enchère introuvable'; end if;
  if v_a.seller_id != v_user then raise exception 'Non autorisé'; end if;
  if v_a.status != 'live' then raise exception 'Enchère déjà terminée'; end if;

  select count(*) into v_bid_count from public.bids where auction_id = p_auction_id;
  if v_bid_count > 0 then raise exception 'Impossible : des offres existent déjà'; end if;

  update public.auctions set status = 'cancelled' where id = p_auction_id;
end;
$$;

create or replace function public.extend_auction(p_auction_id uuid, p_extra_hours numeric default 1)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_a public.auctions%rowtype;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  if p_extra_hours < 0.05 or p_extra_hours > 48 then raise exception 'Durée invalide'; end if;

  select * into v_a from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Enchère introuvable'; end if;
  if v_a.seller_id != v_user then raise exception 'Non autorisé'; end if;
  if v_a.status != 'live' then raise exception 'Enchère terminée'; end if;

  update public.auctions
  set ends_at = greatest(ends_at, now()) + (p_extra_hours || ' hours')::interval
  where id = p_auction_id;
end;
$$;

create or replace function public.edit_auction(
  p_auction_id uuid,
  p_title text default null,
  p_description text default null
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_a public.auctions%rowtype;
  v_bid_count integer;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  select * into v_a from public.auctions where id = p_auction_id for update;
  if not found then raise exception 'Enchère introuvable'; end if;
  if v_a.seller_id != v_user then raise exception 'Non autorisé'; end if;
  if v_a.status != 'live' then raise exception 'Enchère terminée'; end if;

  select count(*) into v_bid_count from public.bids where auction_id = p_auction_id;
  if v_bid_count > 0 then raise exception 'Impossible : des offres existent déjà'; end if;

  update public.auctions set
    title = coalesce(nullif(trim(p_title), ''), title),
    description = case when p_description is not null then nullif(trim(p_description), '') else description end
  where id = p_auction_id;
end;
$$;