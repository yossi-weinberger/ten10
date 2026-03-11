-- Remove hardcoded service_role JWT from cron job command.
-- Replace with vault reference, matching the pattern used for functions_base_url.
--
-- PREREQUISITE: Add 'service_role_key' to Supabase Vault before applying.
--   Dashboard → Project Settings → Vault → New Secret
--   Name: service_role_key
--   Value: <your service_role JWT>

SELECT cron.unschedule('daily-recurring-executor');

SELECT cron.schedule(
  'daily-recurring-executor',
  '0 0 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1) || '/functions/v1/process-recurring-transactions',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
  $$
);
