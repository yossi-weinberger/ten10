-- Save one approved forward-only rule. This does not update existing transactions.
-- The ai schema is not on the Data API, so clients call the public wrappers.

CREATE OR REPLACE FUNCTION ai.approve_user_rule(
  p_name text,
  p_type text,
  p_effective_from date
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := lower(btrim(coalesce(p_name, '')));
  v_existing uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF char_length(v_name) < 2 OR char_length(v_name) > 80
     OR p_type NOT IN ('exempt-income', 'recognized-expense', 'non_tithe_donation')
     OR p_effective_from IS NULL THEN
    RAISE EXCEPTION 'RULE_NOT_READY';
  END IF;

  SELECT id
  INTO v_existing
  FROM ai.user_rules
  WHERE user_id = v_uid
    AND status = 'active'
    AND match->>'name' = v_name
    AND action->>'type' = p_type
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('rule_id', v_existing, 'alreadyActive', true);
  END IF;

  INSERT INTO ai.user_rules (
    user_id,
    match,
    action,
    effective_from,
    status,
    created_via
  ) VALUES (
    v_uid,
    jsonb_build_object('name', v_name),
    jsonb_build_object('type', p_type),
    p_effective_from,
    'active',
    'assistant'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('rule_id', v_id, 'alreadyActive', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.approve_ai_user_rule(
  p_name text,
  p_type text,
  p_effective_from date
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.approve_user_rule(p_name, p_type, p_effective_from);
$$;

CREATE OR REPLACE FUNCTION public.list_ai_user_rules()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'name', match->>'name',
    'type', action->>'type'
  )), '[]'::jsonb)
  FROM ai.user_rules
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;

REVOKE ALL ON FUNCTION ai.approve_user_rule(text, text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_ai_user_rule(text, text, date) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.list_ai_user_rules() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ai.approve_user_rule(text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_ai_user_rule(text, text, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_ai_user_rules() TO authenticated;

DO $check$
BEGIN
  IF has_function_privilege('anon', 'public.approve_ai_user_rule(text, text, date)', 'execute')
     OR has_function_privilege('anon', 'public.list_ai_user_rules()', 'execute') THEN
    RAISE EXCEPTION 'anon must not execute user rule functions';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.approve_ai_user_rule(text, text, date)', 'execute')
     OR NOT has_function_privilege('authenticated', 'public.list_ai_user_rules()', 'execute') THEN
    RAISE EXCEPTION 'authenticated must execute user rule functions';
  END IF;
END;
$check$;
