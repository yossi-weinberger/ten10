-- Rollback for 20261112140000_ai_beta_consents.sql
-- Restores original admin RPCs, drops new columns from user_plans, and drops consent RPCs.
-- After running: supabase migration repair --status reverted 20261112140000

SET check_function_bodies = false;

-- ---------------------------------------------------------------------------
-- Drop public consent RPCs
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.accept_ai_beta_terms(text, jsonb);
DROP FUNCTION IF EXISTS public.ai_beta_consent_status();

-- ---------------------------------------------------------------------------
-- Drop service-role helper
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS ai.has_beta_consent(uuid, text);

-- ---------------------------------------------------------------------------
-- Drop version function
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS ai.current_beta_terms_version();

-- ---------------------------------------------------------------------------
-- Restore original ai.effective_plan (without is_active check)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ai.effective_plan(p_user_id uuid) RETURNS text
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

-- ---------------------------------------------------------------------------
-- Restore original admin_list_user_plans (without is_active column)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_list_user_plans()
RETURNS TABLE (
  user_email text,
  user_id uuid,
  plan text,
  source text,
  expires_at timestamp with time zone,
  note text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  RETURN QUERY
  SELECT
    u.email::text,
    up.user_id,
    up.plan,
    up.source,
    up.expires_at,
    up.note,
    up.created_at,
    up.updated_at
  FROM public.user_plans up
  JOIN auth.users u ON u.id = up.user_id
  ORDER BY up.updated_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_user_plans()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_user_plans()
  TO authenticated;

-- ---------------------------------------------------------------------------
-- Restore original admin_set_user_plan (without is_active=true logic)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_set_user_plan(
  p_email text,
  p_plan text,
  p_expires_on date DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
DECLARE
  v_user_id uuid;
  v_existing_source text;
  v_expires_at timestamp with time zone;
  v_rows_affected integer;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Resolve user by email (case-insensitive, trimmed)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(trim(both from email)) = lower(trim(both from p_email))
    AND deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND'
      USING DETAIL = p_email,
            ERRCODE = 'P0002';
  END IF;

  -- Verify plan exists
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE plan = p_plan) THEN
    RAISE EXCEPTION 'PLAN_NOT_FOUND'
      USING DETAIL = p_plan,
            ERRCODE = 'P0002';
  END IF;

  -- Reject past expiry dates (valid through the chosen day in Asia/Jerusalem)
  IF p_expires_on IS NOT NULL AND p_expires_on < (now() AT TIME ZONE 'Asia/Jerusalem')::date THEN
    RAISE EXCEPTION 'EXPIRY_IN_PAST'
      USING ERRCODE = 'P0001';
  END IF;

  -- Compute expiry timestamp: 23:59:59.999999 on the chosen day in Asia/Jerusalem
  IF p_expires_on IS NOT NULL THEN
    v_expires_at := ((p_expires_on + 1)::timestamp AT TIME ZONE 'Asia/Jerusalem') - interval '1 microsecond';
  ELSE
    v_expires_at := NULL;
  END IF;

  -- Check if existing assignment is from billing (with lock to avoid race)
  SELECT source INTO v_existing_source
  FROM public.user_plans
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_existing_source = 'billing' AND NOT COALESCE(p_force, false) THEN
    RAISE EXCEPTION 'BILLING_REQUIRES_FORCE'
      USING ERRCODE = 'P0001';
  END IF;

  -- Upsert the assignment (protect billing rows in DO UPDATE)
  INSERT INTO public.user_plans (user_id, plan, expires_at, note, source)
  VALUES (v_user_id, p_plan, v_expires_at, p_note, 'manual')
  ON CONFLICT (user_id)
  DO UPDATE SET
    plan = EXCLUDED.plan,
    expires_at = EXCLUDED.expires_at,
    note = EXCLUDED.note,
    source = 'manual',
    updated_at = now()
  WHERE user_plans.source <> 'billing' OR COALESCE(p_force, false);

  GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

  IF v_rows_affected = 0 THEN
    RAISE EXCEPTION 'BILLING_REQUIRES_FORCE'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'email', p_email,
    'plan', p_plan,
    'expires_at', v_expires_at,
    'note', p_note
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Restore original admin_remove_user_plan (DELETE instead of is_active=false)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.admin_remove_user_plan(
  p_email text,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'pg_catalog', 'public', 'auth'
AS $$
DECLARE
  v_user_id uuid;
  v_existing_source text;
  v_deleted boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Resolve user by email (case-insensitive, trimmed)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(trim(both from email)) = lower(trim(both from p_email))
    AND deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'USER_NOT_FOUND'
      USING DETAIL = p_email,
            ERRCODE = 'P0002';
  END IF;

  -- Check if assignment is from billing (with lock to avoid race)
  SELECT source INTO v_existing_source
  FROM public.user_plans
  WHERE user_id = v_user_id
  FOR UPDATE;

  IF v_existing_source IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', v_user_id,
      'email', p_email,
      'deleted', false,
      'reason', 'no_assignment'
    );
  END IF;

  IF v_existing_source = 'billing' AND NOT COALESCE(p_force, false) THEN
    RAISE EXCEPTION 'BILLING_REQUIRES_FORCE'
      USING ERRCODE = 'P0001';
  END IF;

  -- Delete the assignment
  DELETE FROM public.user_plans
  WHERE user_id = v_user_id;

  v_deleted := FOUND;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'email', p_email,
    'deleted', v_deleted
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Drop beta consent columns from user_plans
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_plans 
  DROP COLUMN IF EXISTS beta_terms_version,
  DROP COLUMN IF EXISTS beta_terms_accepted_at,
  DROP COLUMN IF EXISTS is_active;

RESET check_function_bodies;
