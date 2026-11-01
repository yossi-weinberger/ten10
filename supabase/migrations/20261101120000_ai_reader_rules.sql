-- The ai schema is not on the Data API. The reader loads rules through this wrapper.

CREATE OR REPLACE FUNCTION public.list_ai_reader_rules(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', match->>'name',
    'type', action->>'type'
  )), '[]'::jsonb)
  FROM ai.user_rules
  WHERE user_id = p_user_id
    AND status = 'active';
$$;

REVOKE ALL ON FUNCTION public.list_ai_reader_rules(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_ai_reader_rules(uuid) TO service_role;
