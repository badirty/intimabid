-- Active l'extension pg_cron si elle n'est pas déjà active
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Supprime le job existant s'il existe
SELECT cron.unschedule('close-expired-auctions');

-- Planifie la fermeture automatique des enchères expirées toutes les minutes
SELECT cron.schedule(
  'close-expired-auctions',
  '* * * * *',
  'SELECT public.close_expired_auctions();'
);
