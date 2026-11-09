-- AI access by plan. Replaces the Edge trial-user allowlist (trial-users.ts / AI_TRIAL_ONLY).
--
-- Not a column on profiles: users can update their own profiles row and could enable AI
-- for themselves. Writes to user_plans are service_role / postgres only.
--
-- No default plan is seeded, so users without a user_plans row have no AI, as today.

-- ---------------------------------------------------------------------------
-- Catalog and assignments
-- ---------------------------------------------------------------------------
CREATE TABLE public.plans (
    plan text PRIMARY KEY,
    ai_monthly_units integer NOT NULL CHECK (ai_monthly_units >= 0),
    ai_daily_calls integer NOT NULL CHECK (ai_daily_calls >= 0),
    ai_minute_calls integer NOT NULL CHECK (ai_minute_calls >= 0),
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX plans_one_default ON public.plans (is_default) WHERE is_default;

CREATE TABLE public.user_plans (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    plan text NOT NULL REFERENCES public.plans(plan) ON UPDATE CASCADE,
    source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'billing')),
    expires_at timestamp with time zone,
    note text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TRIGGER plans_handle_updated_at
    BEFORE UPDATE ON public.plans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER user_plans_handle_updated_at
    BEFORE UPDATE ON public.user_plans
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Supabase auto-grants new public tables to anon/authenticated. Take that back.
REVOKE ALL ON TABLE public.plans FROM PUBLIC, anon, authenticated;
REVOKE ALL ON TABLE public.user_plans FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.plans TO authenticated;
GRANT SELECT ON TABLE public.user_plans TO authenticated;
GRANT ALL ON TABLE public.plans TO service_role;
GRANT ALL ON TABLE public.user_plans TO service_role;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY plans_select ON public.plans
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY user_plans_select ON public.user_plans
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

-- ---------------------------------------------------------------------------
-- Effective plan: assignment if unexpired, else the default, else none.
-- ---------------------------------------------------------------------------
CREATE FUNCTION ai.effective_plan(p_user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT COALESCE(
    (SELECT up.plan
       FROM public.user_plans up
      WHERE up.user_id = p_user_id
        AND (up.expires_at IS NULL OR up.expires_at > now())),
    (SELECT p.plan FROM public.plans p WHERE p.is_default)
  );
$$;

REVOKE ALL ON FUNCTION ai.effective_plan(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Usage functions: quotas and rate limits come from the effective plan.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ai.usage_quota(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT coalesce(
    (SELECT p.ai_monthly_units
       FROM public.plans p
      WHERE p.plan = ai.effective_plan(p_user_id)),
    0);
$$;

CREATE OR REPLACE FUNCTION ai.take_call(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_day timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_minute timestamptz := date_trunc('minute', now());
  v_calls integer;
  v_daily integer;
  v_per_minute integer;
BEGIN
  SELECT p.ai_daily_calls, p.ai_minute_calls
    INTO v_daily, v_per_minute
    FROM public.plans p
   WHERE p.plan = ai.effective_plan(p_user_id);

  IF v_daily IS NULL OR v_daily <= 0 THEN
    RETURN 'daily_limit';
  END IF;

  INSERT INTO ai.usage_rate AS rate (user_id, bucket, bucket_start, calls)
  VALUES (p_user_id, 'day', v_day, 1)
  ON CONFLICT (user_id, bucket, bucket_start)
  DO UPDATE SET calls = rate.calls + 1 WHERE rate.calls < v_daily
  RETURNING calls INTO v_calls;
  IF v_calls IS NULL THEN
    RETURN 'daily_limit';
  END IF;

  IF v_per_minute IS NULL OR v_per_minute <= 0 THEN
    UPDATE ai.usage_rate SET calls = calls - 1
    WHERE user_id = p_user_id AND bucket = 'day' AND bucket_start = v_day;
    RETURN 'rate_limited';
  END IF;

  v_calls := NULL;
  INSERT INTO ai.usage_rate AS rate (user_id, bucket, bucket_start, calls)
  VALUES (p_user_id, 'minute', v_minute, 1)
  ON CONFLICT (user_id, bucket, bucket_start)
  DO UPDATE SET calls = rate.calls + 1 WHERE rate.calls < v_per_minute
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
  IF ai.usage_quota(p_user_id) = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_allowed');
  END IF;
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

  IF v_quota = 0 THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'not_allowed');
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

-- CREATE OR REPLACE keeps existing grants; repeat the intake revokes so these stay owner-only.
REVOKE ALL ON FUNCTION ai.usage_quota(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.take_call(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.consume_call(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.consume_usage(p_user_id uuid, p_kind text, p_turn uuid, p_op text) FROM PUBLIC, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Client and Edge entry points
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.get_my_ai_access() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_plan text;
  v_total integer := 0;
  v_used integer := 0;
  v_period date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  v_resets timestamptz := ((date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC');
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_plan := ai.effective_plan(v_uid);
  IF v_plan IS NOT NULL THEN
    SELECT p.ai_monthly_units INTO v_total FROM public.plans p WHERE p.plan = v_plan;
  END IF;
  v_total := coalesce(v_total, 0);

  SELECT c.units_used INTO v_used
    FROM ai.usage_counters c
   WHERE c.user_id = v_uid AND c.period_start = v_period;
  v_used := coalesce(v_used, 0);

  RETURN jsonb_build_object(
    'allowed', v_plan IS NOT NULL AND v_total > 0,
    'plan', v_plan,
    'units_total', v_total,
    'units_used', v_used,
    'units_left', greatest(v_total - v_used, 0),
    'resets_at', v_resets
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_ai_access() FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_my_ai_access() TO authenticated;

CREATE FUNCTION public.ai_user_allowed(p_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT p_user_id IS NOT NULL
     AND coalesce(
           (SELECT p.ai_monthly_units
              FROM public.plans p
             WHERE p.plan = ai.effective_plan(p_user_id)),
           0) > 0;
$$;

REVOKE ALL ON FUNCTION public.ai_user_allowed(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.ai_user_allowed(p_user_id uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- Seed: today's beta quotas. No default plan. Former trial users if they still exist.
-- ---------------------------------------------------------------------------
INSERT INTO public.plans (plan, ai_monthly_units, ai_daily_calls, ai_minute_calls, is_default)
VALUES ('beta', 1000, 300, 30, false);

INSERT INTO public.user_plans (user_id, plan, source, note)
SELECT id, 'beta', 'manual', 'trial' FROM auth.users WHERE id IN (
  '01665dce-d261-4a9b-b89d-04ce2460859b',
  '45e3efc0-171b-48ce-9f15-4468394dfaeb',
  'a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4',
  '5403d7d1-3f44-4243-a84a-f905c4aad30c',
  'f336e5d1-4dc2-40c6-b176-c0b199ee836d',
  'a3f81dec-f634-4784-9cc0-9921838a6037',
  'c4e7d297-9ed3-421a-af9c-92ccccf95ba0'
)
ON CONFLICT DO NOTHING;
