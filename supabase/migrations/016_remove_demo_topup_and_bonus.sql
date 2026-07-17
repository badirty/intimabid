-- Supprime la recharge démo et le bonus d'inscription pour la production

-- 1. Supprime la fonction RPC demo_wallet_topup
DROP FUNCTION IF EXISTS public.demo_wallet_topup(integer);

-- 2. Met à jour le trigger d'inscription pour ne plus créditer de bonus
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (new.id, COALESCE(split_part(new.email, '@', 1), 'user'));

  INSERT INTO public.wallets (user_id, balance_cents)
  VALUES (new.id, 0);

  RETURN new;
END;
$$;

-- 3. Réinitialise le solde des wallets qui ont uniquement une transaction topup_demo (bonus ou recharge démo)
WITH demo_users AS (
  SELECT wt.user_id
  FROM public.wallet_transactions wt
  WHERE wt.type = 'topup_demo'
  GROUP BY wt.user_id
  HAVING COUNT(*) FILTER (WHERE wt.type != 'topup_demo') = 0
)
UPDATE public.wallets w
SET balance_cents = 0
FROM demo_users d
WHERE w.user_id = d.user_id;

-- 4. Supprime la contrainte actuelle pour pouvoir nettoyer sans erreur
ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_type_check;

-- 5. Supprime les transactions de type topup_demo (elles ne sont plus utilisées)
DELETE FROM public.wallet_transactions WHERE type = 'topup_demo';

-- 6. Sécurité : si un type inattendu reste présent, on le marche comme 'purchase'
UPDATE public.wallet_transactions
SET type = 'purchase'
WHERE type NOT IN ('topup_stripe', 'bid_hold', 'bid_refund', 'sale_credit', 'withdrawal', 'purchase');

-- 7. Recrée la contrainte sans topup_demo
ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_type_check
  CHECK (type IN ('topup_stripe', 'bid_hold', 'bid_refund', 'sale_credit', 'withdrawal', 'purchase'));
