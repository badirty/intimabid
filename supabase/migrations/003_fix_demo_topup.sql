-- Corrige demo_wallet_topup : crée le wallet si absent (évite UPDATE silencieux à 0 ligne)

create or replace function public.demo_wallet_topup(p_amount_cents integer default 5000)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_new_balance integer;
begin
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