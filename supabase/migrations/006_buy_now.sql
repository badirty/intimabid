-- Ajout achat immédiat (buy now) + durée personnalisée
-- Exécuter dans Supabase → SQL Editor

alter table public.auctions
  add column if not exists buy_now_price_cents integer;
