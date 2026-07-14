-- Recharge min 0,50 € (aligné Stripe EUR + curseur portefeuille)

create or replace function public.demo_wallet_topup(p_amount_cents integer default 5000)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_user uuid := auth.uid();
  v_demo_enabled boolean;
  v_new_balance integer;
begin
  if v_user is null then raise exception 'Non connecté'; end if;

  select coalesce((value::text)::boolean, false) into v_demo_enabled
  from public.app_settings where key = 'demo_wallet_enabled';

  if not coalesce(v_demo_enabled, false) then
    raise exception 'Recharge démo désactivée';
  end if;

  if p_amount_cents < 50 or p_amount_cents > 50000 then
    raise exception 'Montant invalide (0,50 € – 500 €)';
  end if;

  insert into public.wallets (user_id, balance_cents)
  values (v_user, p_amount_cents)
  on conflict (user_id) do update
    set balance_cents = public.wallets.balance_cents + excluded.balance_cents,
        updated_at = now()
  returning balance_cents into v_new_balance;

  insert into public.wallet_transactions (user_id, type, amount_cents, description)
  values (v_user, 'topup_demo', p_amount_cents, 'Recharge démo');

  return json_build_object('ok', true, 'balance_added', p_amount_cents, 'balance_cents', v_new_balance);
end;
$$;