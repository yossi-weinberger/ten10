-- Removes usage limits and their cleanup job.

DO $unschedule$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-usage-cleanup') THEN
    PERFORM cron.unschedule('ai-usage-cleanup');
  END IF;
END;
$unschedule$;

DROP FUNCTION IF EXISTS public.release_ai_usage(uuid);
DROP FUNCTION IF EXISTS public.consume_ai_call(uuid);
DROP FUNCTION IF EXISTS public.consume_ai_usage(uuid, text);
DROP FUNCTION IF EXISTS ai.release_usage(uuid);
DROP FUNCTION IF EXISTS ai.consume_usage(uuid, text);
DROP FUNCTION IF EXISTS ai.consume_call(uuid);
DROP FUNCTION IF EXISTS ai.take_call(uuid);
DROP FUNCTION IF EXISTS ai.usage_weight(text);
DROP FUNCTION IF EXISTS ai.usage_quota(uuid);
DROP TABLE IF EXISTS ai.usage_events;
DROP TABLE IF EXISTS ai.usage_rate;
DROP TABLE IF EXISTS ai.usage_counters;
