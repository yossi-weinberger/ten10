-- Raise monitor-cron-failures net.http_post timeout.
-- 1000ms is too short for send-cron-alerts (DB queries + email).
-- Applies to environments that already ran 20260716100000 with timeout 1000.

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
      timeout_milliseconds := 30000
    );
  $$
);
