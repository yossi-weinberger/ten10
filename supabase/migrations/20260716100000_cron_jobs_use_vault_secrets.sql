-- Move remaining cron jobs off hardcoded URL + service_role JWT.
-- Match daily-recurring-executor: Vault secrets functions_base_url + service_role_key.
--
-- PREREQUISITE: Both secrets must exist in Supabase Vault (see supabase/MIGRATION_VAULT_SETUP.md).

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'functions_base_url'
  ) THEN
    RAISE EXCEPTION
      'Missing vault secret functions_base_url. See supabase/MIGRATION_VAULT_SETUP.md';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM vault.decrypted_secrets WHERE name = 'service_role_key'
  ) THEN
    RAISE EXCEPTION
      'Missing vault secret service_role_key. See supabase/MIGRATION_VAULT_SETUP.md';
  END IF;
END;
$$;

SELECT cron.unschedule('send-reminder-emails');
SELECT cron.schedule(
  'send-reminder-emails',
  '0 18 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1) || '/functions/v1/send-reminder-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
  $$
);

SELECT cron.unschedule('send-new-user-email-daily');
SELECT cron.schedule(
  'send-new-user-email-daily',
  '0 19 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1) || '/functions/v1/send-new-user-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
  $$
);

SELECT cron.unschedule('monitor-cron-failures');
SELECT cron.schedule(
  'monitor-cron-failures',
  '0 7 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1) || '/functions/v1/send-cron-alerts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb,
      timeout_milliseconds := 1000
    );
  $$
);
