-- Manual rollback for 20261110100000_ai_plans.sql: back to post-20261103100000.
-- Restores usage_quota / take_call / consume_usage / consume_call bodies, then drops
-- the plan tables and new functions. Edge no longer has isTrialUser, so turn
-- AI_INTAKE_ENABLED off (or redeploy the previous Edge) before running this.
-- After running it: supabase migration repair --status reverted 20261110100000

DROP TRIGGER IF EXISTS plans_handle_updated_at ON public.plans;
DROP TRIGGER IF EXISTS user_plans_handle_updated_at ON public.user_plans;

DROP FUNCTION IF EXISTS public.get_my_ai_access();
DROP FUNCTION IF EXISTS public.ai_user_allowed(p_user_id uuid);
DROP FUNCTION IF EXISTS ai.effective_plan(p_user_id uuid);

DROP TABLE IF EXISTS public.user_plans;
DROP TABLE IF EXISTS public.plans;

CREATE OR REPLACE FUNCTION ai.usage_quota(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  SELECT 1000;
$$;

CREATE OR REPLACE FUNCTION ai.take_call(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
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
$$;

CREATE OR REPLACE FUNCTION ai.consume_call(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_reason text;
BEGIN
  -- A helper call carries no weight, but it stops with the monthly allowance like every other call.
  IF EXISTS (
    SELECT 1 FROM ai.usage_counters
    WHERE user_id = p_user_id
      AND period_start = date_trunc('month', now() AT TIME ZONE 'UTC')::date
      AND units_used >= ai.usage_quota(p_user_id)
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exhausted');
  END IF;
  v_reason := ai.take_call(p_user_id);
  RETURN jsonb_build_object('allowed', v_reason IS NULL, 'reason', v_reason);
END;
$$;

CREATE OR REPLACE FUNCTION ai.consume_usage(p_user_id uuid, p_kind text, p_turn uuid DEFAULT NULL, p_op text DEFAULT NULL) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_weight integer := ai.usage_weight(p_kind);
  v_quota integer := ai.usage_quota(p_user_id);
  v_period date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  v_resets timestamptz := ((date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC');
  v_reason text;
  v_used integer;
  v_usage_id uuid;
  v_joined boolean;
BEGIN
  IF v_weight IS NULL THEN
    RAISE EXCEPTION 'USAGE_KIND_INVALID';
  END IF;

  v_reason := ai.take_call(p_user_id);
  IF v_reason IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', v_reason, 'resets_at', v_resets);
  END IF;

  -- One message, one charge: its classify, split and question calls bring the same turn and join the
  -- first call's charge. Each operation joins once, only while the charge is fresh and not given back;
  -- otherwise the call pays on its own. The first call of a turn holds the row, so calls that arrive
  -- together still charge once.
  IF p_turn IS NOT NULL THEN
    INSERT INTO ai.usage_events AS charge (user_id, kind, units, period_start, turn_id, ops)
    VALUES (p_user_id, p_kind, v_weight, v_period, p_turn, ARRAY[p_op])
    ON CONFLICT (user_id, turn_id) WHERE turn_id IS NOT NULL
    DO UPDATE SET ops = charge.ops || p_op
    WHERE charge.released_at IS NULL
      AND charge.created_at > now() - interval '2 minutes'
      AND NOT p_op = ANY (charge.ops)
    RETURNING id, cardinality(ops) > 1 INTO v_usage_id, v_joined;
    IF v_joined THEN
      RETURN jsonb_build_object('allowed', true, 'reason', NULL, 'usage_id', v_usage_id, 'resets_at', v_resets);
    END IF;
  END IF;

  INSERT INTO ai.usage_counters AS counter (user_id, period_start, units_used)
  SELECT p_user_id, v_period, v_weight
  WHERE v_weight <= v_quota
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET units_used = counter.units_used + v_weight
  WHERE counter.units_used + v_weight <= v_quota
  RETURNING units_used INTO v_used;

  IF v_used IS NULL THEN
    -- A turn row that was never charged must not be joined.
    DELETE FROM ai.usage_events WHERE id = v_usage_id;
    UPDATE ai.usage_rate SET calls = greatest(calls - 1, 0)
    WHERE user_id = p_user_id
      AND ((bucket = 'day' AND bucket_start = date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
        OR (bucket = 'minute' AND bucket_start = date_trunc('minute', now())));
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exhausted', 'resets_at', v_resets);
  END IF;

  IF v_usage_id IS NULL THEN
    INSERT INTO ai.usage_events (user_id, kind, units, period_start)
    VALUES (p_user_id, p_kind, v_weight, v_period)
    RETURNING id INTO v_usage_id;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', NULL,
    'usage_id', v_usage_id,
    'units_left', v_quota - v_used,
    'resets_at', v_resets
  );
END;
$$;

REVOKE ALL ON FUNCTION ai.usage_quota(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.take_call(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.consume_call(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.consume_usage(p_user_id uuid, p_kind text, p_turn uuid, p_op text) FROM PUBLIC, anon, authenticated, service_role;
