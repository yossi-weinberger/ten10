-- One row per model call from Edge, including failures.
-- No message text, image, amount, or file path. Kept 13 months.

CREATE TABLE ai.model_calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN (
    'intent', 'question_slots', 'receipt', 'speech', 'duplicates', 'shadow'
  )),
  model text NOT NULL,
  ok boolean NOT NULL,
  http_status integer,
  error_code text CHECK (error_code IN (
    'timeout', 'network', 'http_4xx', 'http_5xx', 'unreadable'
  )),
  latency_ms integer NOT NULL CHECK (latency_ms >= 0),
  input_tokens integer CHECK (input_tokens >= 0),
  output_tokens integer CHECK (output_tokens >= 0),
  cost_usd numeric(14, 9) CHECK (cost_usd >= 0),
  generation_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ok = (error_code IS NULL))
);

CREATE INDEX model_calls_created_at_idx ON ai.model_calls (created_at);
CREATE INDEX model_calls_user_created_idx ON ai.model_calls (user_id, created_at);

ALTER TABLE ai.model_calls ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON ai.model_calls FROM PUBLIC, anon, authenticated;
GRANT ALL ON ai.model_calls TO service_role;

CREATE OR REPLACE FUNCTION ai.record_model_call(
  p_user_id uuid,
  p_operation text,
  p_model text,
  p_ok boolean,
  p_http_status integer,
  p_error_code text,
  p_latency_ms integer,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cost_usd numeric,
  p_generation_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  INSERT INTO ai.model_calls (
    user_id, operation, model, ok, http_status, error_code, latency_ms,
    input_tokens, output_tokens, cost_usd, generation_id
  ) VALUES (
    p_user_id, p_operation, left(p_model, 100), p_ok, p_http_status, p_error_code, p_latency_ms,
    p_input_tokens, p_output_tokens, p_cost_usd, left(p_generation_id, 100)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_ai_model_call(
  p_user_id uuid,
  p_operation text,
  p_model text,
  p_ok boolean,
  p_http_status integer,
  p_error_code text,
  p_latency_ms integer,
  p_input_tokens integer,
  p_output_tokens integer,
  p_cost_usd numeric,
  p_generation_id text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  PERFORM ai.record_model_call(
    p_user_id, p_operation, p_model, p_ok, p_http_status, p_error_code, p_latency_ms,
    p_input_tokens, p_output_tokens, p_cost_usd, p_generation_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION ai.record_model_call(
  uuid, text, text, boolean, integer, text, integer, integer, integer, numeric, text
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ai_model_call(
  uuid, text, text, boolean, integer, text, integer, integer, integer, numeric, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_model_call(
  uuid, text, text, boolean, integer, text, integer, integer, integer, numeric, text
) TO service_role;

DO $unschedule$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-model-calls-retention') THEN
    PERFORM cron.unschedule('ai-model-calls-retention');
  END IF;
END;
$unschedule$;

SELECT cron.schedule(
  'ai-model-calls-retention',
  '45 4 * * *',
  $$DELETE FROM ai.model_calls WHERE created_at < now() - interval '13 months'$$
);
