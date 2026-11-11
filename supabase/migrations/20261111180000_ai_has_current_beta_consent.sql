-- Service-role gate for the current AI beta terms.
-- PostgREST exposes public only, so the edge function cannot call ai.* over RPC.
-- The wrapper is the one call: it asks ai.has_beta_consent for ai.current_beta_terms_version().
--
-- Rollback: supabase/migrations/rollback/20261111180000_ai_has_current_beta_consent_down.sql

CREATE FUNCTION public.ai_has_current_beta_consent(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT ai.has_beta_consent(p_user_id, ai.current_beta_terms_version());
$$;

COMMENT ON FUNCTION public.ai_has_current_beta_consent(uuid) IS
  'Service-role only. True when the user has an active plan and has accepted ai.current_beta_terms_version().';

REVOKE ALL ON FUNCTION public.ai_has_current_beta_consent(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ai_has_current_beta_consent(uuid) TO service_role;
