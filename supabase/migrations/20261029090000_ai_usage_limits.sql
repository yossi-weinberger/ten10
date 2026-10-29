-- Usage limits checked by Edge before each provider call.
-- Units per UTC calendar month, plus a per-minute and a per-day call cap for every model call.
-- The numbers are placeholders until a month of ai.model_calls data is in.

CREATE TABLE ai.usage_counters (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  period_start date NOT NULL,
  units_used integer NOT NULL CHECK (units_used >= 0),
  PRIMARY KEY (user_id, period_start)
);

CREATE TABLE ai.usage_rate (
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  bucket text NOT NULL CHECK (bucket IN ('minute', 'day')),
  bucket_start timestamptz NOT NULL,
  calls integer NOT NULL CHECK (calls >= 0),
  PRIMARY KEY (user_id, bucket, bucket_start)
);

CREATE TABLE ai.usage_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('text', 'receipt', 'speech')),
  units integer NOT NULL CHECK (units > 0),
  period_start date NOT NULL,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX usage_events_created_at_idx ON ai.usage_events (created_at);

ALTER TABLE ai.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.usage_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.usage_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON ai.usage_counters, ai.usage_rate, ai.usage_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON ai.usage_counters, ai.usage_rate, ai.usage_events TO service_role;

/** One place for the numbers. Plans replace this later. */
CREATE OR REPLACE FUNCTION ai.usage_quota(p_user_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
AS $function$
  SELECT 1000;
$function$;

CREATE OR REPLACE FUNCTION ai.usage_weight(p_kind text)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT CASE p_kind WHEN 'receipt' THEN 5 WHEN 'speech' THEN 3 WHEN 'text' THEN 1 END;
$function$;

/**
 * Counts one call in the minute and the day bucket. The update only happens under the cap,
 * so two calls at the cap cannot both pass. Returns null when allowed, else the reason.
 */
CREATE OR REPLACE FUNCTION ai.take_call(p_user_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_day timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_minute timestamptz := date_trunc('minute', now());
  v_calls integer;
BEGIN
  INSERT INTO ai.usage_rate AS rate (user_id, bucket, bucket_start, calls)
  VALUES (p_user_id, 'day', v_day, 1)
  ON CONFLICT (user_id, bucket, bucket_start)
  DO UPDATE SET calls = rate.calls + 1 WHERE rate.calls < 300
  RETURNING calls INTO v_calls;
  IF v_calls IS NULL THEN
    RETURN 'daily_limit';
  END IF;

  v_calls := NULL;
  INSERT INTO ai.usage_rate AS rate (user_id, bucket, bucket_start, calls)
  VALUES (p_user_id, 'minute', v_minute, 1)
  ON CONFLICT (user_id, bucket, bucket_start)
  DO UPDATE SET calls = rate.calls + 1 WHERE rate.calls < 30
  RETURNING calls INTO v_calls;
  IF v_calls IS NULL THEN
    UPDATE ai.usage_rate SET calls = calls - 1
    WHERE user_id = p_user_id AND bucket = 'day' AND bucket_start = v_day;
    RETURN 'rate_limited';
  END IF;
  RETURN NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION ai.consume_call(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_reason text;
BEGIN
  v_reason := ai.take_call(p_user_id);
  RETURN jsonb_build_object('allowed', v_reason IS NULL, 'reason', v_reason);
END;
$function$;

CREATE OR REPLACE FUNCTION ai.consume_usage(p_user_id uuid, p_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_weight integer := ai.usage_weight(p_kind);
  v_quota integer := ai.usage_quota(p_user_id);
  v_period date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  v_resets timestamptz := ((date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC');
  v_reason text;
  v_used integer;
  v_usage_id uuid;
BEGIN
  IF v_weight IS NULL THEN
    RAISE EXCEPTION 'USAGE_KIND_INVALID';
  END IF;

  v_reason := ai.take_call(p_user_id);
  IF v_reason IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', v_reason, 'resets_at', v_resets);
  END IF;

  INSERT INTO ai.usage_counters AS counter (user_id, period_start, units_used)
  SELECT p_user_id, v_period, v_weight
  WHERE v_weight <= v_quota
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET units_used = counter.units_used + v_weight
  WHERE counter.units_used + v_weight <= v_quota
  RETURNING units_used INTO v_used;

  IF v_used IS NULL THEN
    UPDATE ai.usage_rate SET calls = greatest(calls - 1, 0)
    WHERE user_id = p_user_id
      AND ((bucket = 'day' AND bucket_start = date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
        OR (bucket = 'minute' AND bucket_start = date_trunc('minute', now())));
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exhausted', 'resets_at', v_resets);
  END IF;

  INSERT INTO ai.usage_events (user_id, kind, units, period_start)
  VALUES (p_user_id, p_kind, v_weight, v_period)
  RETURNING id INTO v_usage_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', NULL,
    'usage_id', v_usage_id,
    'units_left', v_quota - v_used,
    'resets_at', v_resets
  );
END;
$function$;

/** Gives the units back after a provider failure. A second call for the same id does nothing. */
CREATE OR REPLACE FUNCTION ai.release_usage(p_usage_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_event ai.usage_events%ROWTYPE;
BEGIN
  UPDATE ai.usage_events SET released_at = now()
  WHERE id = p_usage_id AND released_at IS NULL
  RETURNING * INTO v_event;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  UPDATE ai.usage_counters
  SET units_used = greatest(units_used - v_event.units, 0)
  WHERE user_id = v_event.user_id AND period_start = v_event.period_start;
  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_ai_usage(p_user_id uuid, p_kind text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN ai.consume_usage(p_user_id, p_kind);
END;
$function$;

CREATE OR REPLACE FUNCTION public.consume_ai_call(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN ai.consume_call(p_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.release_ai_usage(p_usage_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_usage_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN ai.release_usage(p_usage_id);
END;
$function$;

REVOKE ALL ON FUNCTION ai.usage_quota(uuid), ai.usage_weight(text), ai.take_call(uuid), ai.consume_call(uuid),
  ai.consume_usage(uuid, text), ai.release_usage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.consume_ai_usage(uuid, text), public.consume_ai_call(uuid), public.release_ai_usage(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_ai_usage(uuid, text), public.consume_ai_call(uuid), public.release_ai_usage(uuid)
  TO service_role;

DO $unschedule$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-usage-cleanup') THEN
    PERFORM cron.unschedule('ai-usage-cleanup');
  END IF;
END;
$unschedule$;

SELECT cron.schedule(
  'ai-usage-cleanup',
  '50 4 * * *',
  $$
    DELETE FROM ai.usage_rate WHERE bucket_start < now() - interval '2 days';
    DELETE FROM ai.usage_events WHERE created_at < now() - interval '13 months';
    DELETE FROM ai.usage_counters WHERE period_start < (now() - interval '13 months')::date;
  $$
);
