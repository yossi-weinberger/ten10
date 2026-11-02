-- Turn off one active forward-only rule. Existing transactions stay as they are.

CREATE OR REPLACE FUNCTION ai.disable_user_rule(p_name text, p_type text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := lower(btrim(coalesce(p_name, '')));
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_type NOT IN ('exempt-income', 'recognized-expense', 'non_tithe_donation') THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  UPDATE ai.user_rules
  SET status = 'disabled',
      version = version + 1,
      updated_at = now()
  WHERE user_id = v_uid
    AND status = 'active'
    AND match->>'name' = v_name
    AND action->>'type' = p_type
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('disabled', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.disable_ai_user_rule(p_name text, p_type text)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.disable_user_rule(p_name, p_type);
$$;

REVOKE ALL ON FUNCTION ai.disable_user_rule(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.disable_ai_user_rule(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ai.disable_user_rule(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.disable_ai_user_rule(text, text) TO authenticated;

DO $check$
BEGIN
  IF has_function_privilege('anon', 'public.disable_ai_user_rule(text, text)', 'execute') THEN
    RAISE EXCEPTION 'anon must not execute disable_ai_user_rule';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.disable_ai_user_rule(text, text)', 'execute') THEN
    RAISE EXCEPTION 'authenticated must execute disable_ai_user_rule';
  END IF;
END;
$check$;
