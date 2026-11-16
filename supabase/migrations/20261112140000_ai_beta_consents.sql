-- AI beta consent record (PR-4, revised design): consent in user_plans, not a separate table.
-- Consent is irreversible: once accepted, it cannot be un-accepted (but a newer version may be accepted later).
-- is_active: admin can revoke access by setting is_active=false (keeps plan + beta columns for audit).
--
-- Rollback: supabase/migrations/rollback/20261112140000_ai_beta_consents_down.sql

SET check_function_bodies = false;

-- ---------------------------------------------------------------------------
-- Current beta terms version (single source of truth in SQL)
-- ---------------------------------------------------------------------------
CREATE FUNCTION ai.current_beta_terms_version() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  SELECT 'beta-v1'::text;
$$;

COMMENT ON FUNCTION ai.current_beta_terms_version() IS 
  'Returns the current AI beta terms version. This must match the client and edge constant AI_BETA_TERMS_VERSION.';

-- ---------------------------------------------------------------------------
-- Add beta consent columns to public.user_plans
-- ---------------------------------------------------------------------------
ALTER TABLE public.user_plans 
  ADD COLUMN beta_terms_version text NULL CHECK (length(beta_terms_version) <= 20),
  ADD COLUMN beta_terms_accepted_at timestamptz NULL,
  ADD COLUMN is_active boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.user_plans.beta_terms_version IS 
  'AI beta terms version accepted by the user. NULL if never accepted.';

COMMENT ON COLUMN public.user_plans.beta_terms_accepted_at IS 
  'Timestamp when the user accepted the beta terms. NULL if never accepted.';

COMMENT ON COLUMN public.user_plans.is_active IS 
  'Whether the plan assignment is active. Admin can revoke by setting to false (keeps row for audit).';

-- ---------------------------------------------------------------------------
-- Update ai.effective_plan to treat is_active=false as no plan
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ai.effective_plan(p_user_id uuid) RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT COALESCE(
    (SELECT up.plan
       FROM public.user_plans up
      WHERE up.user_id = p_user_id
        AND up.is_active = true
        AND (up.expires_at IS NULL OR up.expires_at > now())),
    (SELECT p.plan FROM public.plans p WHERE p.is_default)
  );
$$;

COMMENT ON FUNCTION ai.effective_plan(p_user_id uuid) IS 
  'Returns the effective plan for a user. Treats is_active=false as no plan.';

-- ---------------------------------------------------------------------------
-- Update admin_remove_user_plan to set is_active=false instead of DELETE
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
  v_deactivated boolean := false;
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

  -- Set is_active=false instead of DELETE (keeps row for audit, including beta columns)
  UPDATE public.user_plans
  SET is_active = false, updated_at = now()
  WHERE user_id = v_user_id;

  v_deactivated := FOUND;

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'email', p_email,
    'deleted', v_deactivated
  );
END;
$$;

COMMENT ON FUNCTION public.admin_remove_user_plan(text, boolean) IS 
  'Admin-only. Sets is_active=false instead of DELETE. Keeps row for audit (plan, source, beta columns).';

-- ---------------------------------------------------------------------------
-- Update admin_set_user_plan to set is_active=true when assigning/re-assigning
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

  -- Upsert the assignment (protect billing rows in DO UPDATE, always set is_active=true)
  INSERT INTO public.user_plans (user_id, plan, expires_at, note, source, is_active)
  VALUES (v_user_id, p_plan, v_expires_at, p_note, 'manual', true)
  ON CONFLICT (user_id)
  DO UPDATE SET
    plan = EXCLUDED.plan,
    expires_at = EXCLUDED.expires_at,
    note = EXCLUDED.note,
    source = 'manual',
    is_active = true,
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

COMMENT ON FUNCTION public.admin_set_user_plan(text, text, date, text, boolean) IS 
  'Admin-only. Sets is_active=true when assigning/re-assigning a plan.';

-- ---------------------------------------------------------------------------
-- Update admin_list_user_plans to return is_active column
-- (must DROP first because return type changes)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.admin_list_user_plans();

CREATE FUNCTION public.admin_list_user_plans()
RETURNS TABLE (
  user_email text,
  user_id uuid,
  plan text,
  source text,
  expires_at timestamp with time zone,
  note text,
  is_active boolean,
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
    up.is_active,
    up.created_at,
    up.updated_at
  FROM public.user_plans up
  JOIN auth.users u ON u.id = up.user_id
  ORDER BY up.updated_at DESC;
END;
$$;

COMMENT ON FUNCTION public.admin_list_user_plans() IS 
  'Admin-only. Lists all user plan assignments with is_active column.';

REVOKE ALL ON FUNCTION public.admin_list_user_plans()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_user_plans()
  TO authenticated;

-- ---------------------------------------------------------------------------
-- RPC: Accept AI beta terms (authenticated users only)
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.accept_ai_beta_terms(
  p_version text,
  p_metadata jsonb DEFAULT '{}'::jsonb
) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current_version text;
  v_plan_exists boolean;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  -- Get current version
  v_current_version := ai.current_beta_terms_version();

  -- Validate that the version matches current
  IF p_version IS NULL OR p_version <> v_current_version THEN
    RAISE EXCEPTION 'VERSION_MISMATCH' USING 
      DETAIL = 'Requested version does not match current version',
      HINT = v_current_version;
  END IF;

  -- Check if user has an active user_plans row
  SELECT EXISTS (
    SELECT 1 FROM public.user_plans
    WHERE user_id = v_uid AND is_active = true
  ) INTO v_plan_exists;

  IF NOT v_plan_exists THEN
    RAISE EXCEPTION 'NO_ACTIVE_PLAN';
  END IF;

  -- Update the user's own row (consent is irreversible, only version+timestamp change)
  -- p_metadata is accepted but ignored (no storage) for compatibility with PR #707
  UPDATE public.user_plans
  SET 
    beta_terms_version = p_version,
    beta_terms_accepted_at = now(),
    updated_at = now()
  WHERE user_id = v_uid AND is_active = true;

  RETURN jsonb_build_object(
    'success', true,
    'version', p_version,
    'accepted_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.accept_ai_beta_terms(text, jsonb) IS 
  'Records user consent to AI beta terms. Requires active user_plans row. Validates version against current. Metadata param accepted but ignored for compatibility.';

-- ---------------------------------------------------------------------------
-- RPC: Check AI beta consent status (authenticated users only)
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.ai_beta_consent_status() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_current_version text;
  v_plan_row public.user_plans%ROWTYPE;
  v_accepted boolean := false;
  v_accepted_version text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_current_version := ai.current_beta_terms_version();

  -- Check if user has an active plan with accepted current version
  SELECT * INTO v_plan_row
  FROM public.user_plans
  WHERE user_id = v_uid
    AND is_active = true
  LIMIT 1;

  IF FOUND AND v_plan_row.beta_terms_version = v_current_version THEN
    v_accepted := true;
    v_accepted_version := v_plan_row.beta_terms_version;
  END IF;

  RETURN jsonb_build_object(
    'accepted', v_accepted,
    'version', v_accepted_version,
    'current', v_current_version
  );
END;
$$;

COMMENT ON FUNCTION public.ai_beta_consent_status() IS 
  'Returns consent status for the calling user: {accepted, version, current}. accepted is true only if current version is accepted and plan is active.';

-- ---------------------------------------------------------------------------
-- Service-role only helper: Check if a user has consented to a version
-- ---------------------------------------------------------------------------
CREATE FUNCTION ai.has_beta_consent(
  p_user_id uuid,
  p_version text
) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_has_consent boolean := false;
BEGIN
  -- This function is for service_role only (edge functions, cron jobs)
  -- It checks if a specific user has accepted a specific version and has an active plan
  
  SELECT EXISTS (
    SELECT 1
    FROM public.user_plans
    WHERE user_id = p_user_id
      AND beta_terms_version = p_version
      AND is_active = true
  ) INTO v_has_consent;

  RETURN v_has_consent;
END;
$$;

COMMENT ON FUNCTION ai.has_beta_consent(uuid, text) IS 
  'Service-role only. Returns true if the specified user has accepted the specified version and has an active plan.';

-- ---------------------------------------------------------------------------
-- Grants: authenticated can EXECUTE accept and status; service_role only for has_beta_consent
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.accept_ai_beta_terms(text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_ai_beta_terms(text, jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.ai_beta_consent_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_beta_consent_status() TO authenticated;

REVOKE ALL ON FUNCTION ai.has_beta_consent(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ai.has_beta_consent(uuid, text) TO service_role;

REVOKE ALL ON FUNCTION ai.current_beta_terms_version() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ai.current_beta_terms_version() TO authenticated, service_role;

RESET check_function_bodies;
