-- Retraits automatiques : annulation + complétion Stripe

alter table public.withdrawal_requests
  add column if not exists stripe_transfer_id text;

alter table public.wallet_transactions
  drop constraint if exists wallet_transactions_type_check;

alter table public.wallet_transactions
  add constraint wallet_transactions_type_check
  check (type in (
    'topup_demo', 'topup_stripe', 'bid_hold', 'bid_refund', 'sale_credit',
    'withdrawal', 'purchase', 'withdrawal_cancel'
  ));

-- Réserve un retrait (solde → pending), retourne l'id de la demande
create or replace function public.request_withdrawal(p_amount_cents integer)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_bal integer;
  v_pending integer;
  v_request_id uuid;
begin
  if v_user is null then raise exception 'Non connecté'; end if;
  if p_amount_cents < 100 then raise exception 'Retrait minimum : 1 €'; end if;

  select balance_cents, pending_cents into v_bal, v_pending
  from public.wallets where user_id = v_user for update;

  if v_bal is null or v_bal < p_amount_cents then raise exception 'Solde insuffisant'; end if;
  if v_pending > 0 then raise exception 'Un retrait est déjà en attente — annule-le d''abord'; end if;

  update public.wallets
  set balance_cents = balance_cents - p_amount_cents,
      pending_cents = pending_cents + p_amount_cents,
      updated_at = now()
  where user_id = v_user;

  insert into public.withdrawal_requests (user_id, amount_cents)
  values (v_user, p_amount_cents)
  returning id into v_request_id;

  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_user, 'withdrawal', -p_amount_cents, 'Retrait vers compte bancaire');

  return json_build_object('ok', true, 'request_id', v_request_id);
end;
$$;

-- Annule tous les retraits pending de l'utilisateur connecté
create or replace function public.cancel_pending_withdrawal()
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_total integer;
begin
  if v_user is null then raise exception 'Non connecté'; end if;

  select coalesce(sum(amount_cents), 0) into v_total
  from public.withdrawal_requests
  where user_id = v_user and status = 'pending';

  if v_total = 0 then
    return json_build_object('ok', true, 'cancelled_cents', 0);
  end if;

  update public.withdrawal_requests
  set status = 'rejected'
  where user_id = v_user and status = 'pending';

  update public.wallets
  set balance_cents = balance_cents + v_total,
      pending_cents = pending_cents - v_total,
      updated_at = now()
  where user_id = v_user;

  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_user, 'withdrawal_cancel', v_total, 'Annulation retrait');

  return json_build_object('ok', true, 'cancelled_cents', v_total);
end;
$$;

-- Rollback d'une demande précise (API Stripe en cas d'échec)
create or replace function public.cancel_withdrawal_request(p_request_id uuid)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_req public.withdrawal_requests%rowtype;
begin
  select * into v_req from public.withdrawal_requests where id = p_request_id for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if v_req.status != 'pending' then raise exception 'Demande déjà traitée'; end if;

  update public.withdrawal_requests set status = 'rejected' where id = p_request_id;

  update public.wallets
  set balance_cents = balance_cents + v_req.amount_cents,
      pending_cents = pending_cents - v_req.amount_cents,
      updated_at = now()
  where user_id = v_req.user_id;

  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_req.user_id, 'withdrawal_cancel', v_req.amount_cents, 'Échec virement — remboursé');

  return json_build_object('ok', true, 'cancelled_cents', v_req.amount_cents);
end;
$$;

-- Finalise après transfer Stripe OK
create or replace function public.complete_withdrawal(p_request_id uuid, p_stripe_transfer_id text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_req public.withdrawal_requests%rowtype;
begin
  select * into v_req from public.withdrawal_requests where id = p_request_id for update;
  if not found then raise exception 'Demande introuvable'; end if;
  if v_req.status != 'pending' then raise exception 'Demande déjà traitée'; end if;

  update public.withdrawal_requests
  set status = 'completed', stripe_transfer_id = p_stripe_transfer_id
  where id = p_request_id;

  update public.wallets
  set pending_cents = pending_cents - v_req.amount_cents,
      updated_at = now()
  where user_id = v_req.user_id;

  return json_build_object('ok', true, 'amount_cents', v_req.amount_cents);
end;
$$;

-- Admin SQL Editor : annuler les retraits pending d'un email (rollback manuel)
create or replace function public.admin_cancel_withdrawals_for_email(p_email text)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
  v_total integer;
begin
  select id into v_user from auth.users where email = p_email;
  if not found then raise exception 'Utilisateur introuvable'; end if;

  select coalesce(sum(amount_cents), 0) into v_total
  from public.withdrawal_requests where user_id = v_user and status = 'pending';

  if v_total = 0 then return json_build_object('ok', true, 'cancelled_cents', 0); end if;

  update public.withdrawal_requests set status = 'rejected'
  where user_id = v_user and status = 'pending';

  update public.wallets
  set balance_cents = balance_cents + v_total,
      pending_cents = pending_cents - v_total,
      updated_at = now()
  where user_id = v_user;

  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_user, 'withdrawal_cancel', v_total, 'Annulation retrait (admin)');

  return json_build_object('ok', true, 'cancelled_cents', v_total, 'user_id', v_user);
end;
$$;