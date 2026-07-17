-- Active l'extension pg_cron si elle n'est pas déjà active (peut échouer sur certains plans)
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'pg_cron non disponible sur ce plan Supabase — le fallback Vercel prendra le relais.';
END;
$$;

-- Planifie la fermeture automatique des enchères expirées toutes les minutes (si pg_cron est disponible)
DO $$
BEGIN
  PERFORM cron.unschedule('close-expired-auctions');
  PERFORM cron.schedule(
    'close-expired-auctions',
    '* * * * *',
    'SELECT public.close_expired_auctions();'
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Impossible de planifier le cron Supabase : %', SQLERRM;
END;
$$;
