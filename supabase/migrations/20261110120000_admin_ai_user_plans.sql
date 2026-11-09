-- Admin functions to manage AI user plan assignments.
-- Requires public.plans and public.user_plans from 20261110100000_ai_plans.sql.
-- Admin-only: SECURITY DEFINER + is_admin_user() guard.

-- ---------------------------------------------------------------------------
-- List all user plan assignments with user email
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.admin_list_user_plans()
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
SET search_path TO 'public', 'auth', 'pg_catalog'
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
    u.email,
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

-- ---------------------------------------------------------------------------
-- Set or update a user's plan assignment by email
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.admin_set_user_plan(
  p_email text,
  p_plan text,
  p_expires_at timestamp with time zone DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_catalog'
AS $$
DECLARE
  v_user_id uuid;
  v_existing_source text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Resolve user by email (case-insensitive)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
    AND deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_email
      USING ERRCODE = 'P0002';
  END IF;

  -- Verify plan exists
  IF NOT EXISTS (SELECT 1 FROM public.plans WHERE plan = p_plan) THEN
    RAISE EXCEPTION 'Plan not found: %', p_plan
      USING ERRCODE = 'P0002';
  END IF;

  -- Check if existing assignment is from billing
  SELECT source INTO v_existing_source
  FROM public.user_plans
  WHERE user_id = v_user_id;

  IF v_existing_source = 'billing' AND NOT p_force THEN
    RAISE EXCEPTION 'Cannot overwrite billing assignment without force flag'
      USING ERRCODE = '23505';
  END IF;

  -- Upsert the assignment
  INSERT INTO public.user_plans (user_id, plan, expires_at, note, source)
  VALUES (v_user_id, p_plan, p_expires_at, p_note, 'manual')
  ON CONFLICT (user_id)
  DO UPDATE SET
    plan = EXCLUDED.plan,
    expires_at = EXCLUDED.expires_at,
    note = EXCLUDED.note,
    source = 'manual',
    updated_at = now();

  RETURN jsonb_build_object(
    'user_id', v_user_id,
    'email', p_email,
    'plan', p_plan,
    'expires_at', p_expires_at,
    'note', p_note
  );
END;
$$;

-- ---------------------------------------------------------------------------
-- Remove a user's plan assignment by email
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.admin_remove_user_plan(
  p_email text,
  p_force boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'auth', 'pg_catalog'
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

  -- Resolve user by email (case-insensitive)
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE lower(email) = lower(p_email)
    AND deleted_at IS NULL;

  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'User not found: %', p_email
      USING ERRCODE = 'P0002';
  END IF;

  -- Check if assignment is from billing
  SELECT source INTO v_existing_source
  FROM public.user_plans
  WHERE user_id = v_user_id;

  IF v_existing_source IS NULL THEN
    RETURN jsonb_build_object(
      'user_id', v_user_id,
      'email', p_email,
      'deleted', false,
      'reason', 'no_assignment'
    );
  END IF;

  IF v_existing_source = 'billing' AND NOT p_force THEN
    RAISE EXCEPTION 'Cannot remove billing assignment without force flag'
      USING ERRCODE = '23505';
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
-- Grants
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.admin_list_user_plans()
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_user_plans()
  TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_user_plan(text, text, timestamp with time zone, text, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_plan(text, text, timestamp with time zone, text, boolean)
  TO authenticated;

REVOKE ALL ON FUNCTION public.admin_remove_user_plan(text, boolean)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_remove_user_plan(text, boolean)
  TO authenticated;
