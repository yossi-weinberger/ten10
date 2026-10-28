-- Removes model call storage and its retention job.

DO $unschedule$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-model-calls-retention') THEN
    PERFORM cron.unschedule('ai-model-calls-retention');
  END IF;
END;
$unschedule$;

DROP FUNCTION IF EXISTS public.record_ai_model_call(
  uuid, text, text, boolean, integer, text, integer, integer, integer, numeric, text
);
DROP FUNCTION IF EXISTS ai.record_model_call(
  uuid, text, text, boolean, integer, text, integer, integer, integer, numeric, text
);
DROP TABLE IF EXISTS ai.model_calls;
