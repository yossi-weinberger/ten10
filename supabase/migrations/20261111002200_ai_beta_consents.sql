-- AI beta consent record (PR-4): migration only, no client UI or edge function changes yet.
-- This establishes the consent table, RPCs for accepting terms and checking status, and a
-- service-role helper for server-side consent checks. The current terms version is a SQL
-- function that must match the client/edge constant AI_BETA_TERMS_VERSION.
--
-- Rollback: supabase/migrations/rollback/20261111002200_ai_beta_consents_down.sql

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
-- Consent record table
-- ---------------------------------------------------------------------------
CREATE TABLE ai.beta_consents (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  terms_version text NOT NULL CHECK (length(terms_version) <= 20),
  accepted_at timestamptz NOT NULL DEFAULT now(),
  opted_out_at timestamptz,
  accepted_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (user_id, terms_version)
);

COMMENT ON TABLE ai.beta_consents IS 
  'Records AI beta terms acceptance and opt-out. Row is kept after opt-out as proof of consent and withdrawal (pending lawyer confirmation, Decision D6).';

COMMENT ON COLUMN ai.beta_consents.accepted_metadata IS 
  'Whitelisted metadata only: {platform, locale, country_header}. No IP address. Length-limited at write time.';

-- ---------------------------------------------------------------------------
-- RLS policies: authenticated users can SELECT only their own rows
-- ---------------------------------------------------------------------------
ALTER TABLE ai.beta_consents ENABLE ROW LEVEL SECURITY;

CREATE POLICY beta_consents_select ON ai.beta_consents
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

REVOKE ALL ON ai.beta_consents FROM PUBLIC, anon, authenticated;
GRANT SELECT ON ai.beta_consents TO authenticated;
GRANT ALL ON ai.beta_consents TO service_role;

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
  v_clean_metadata jsonb;
  v_platform text;
  v_locale text;
  v_country text;
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

  -- Whitelist and length-limit metadata fields
  v_platform := left(coalesce(p_metadata->>'platform', ''), 50);
  v_locale := left(coalesce(p_metadata->>'locale', ''), 10);
  v_country := left(coalesce(p_metadata->>'country_header', ''), 2);

  v_clean_metadata := jsonb_build_object(
    'platform', nullif(v_platform, ''),
    'locale', nullif(v_locale, ''),
    'country_header', nullif(v_country, '')
  );

  -- Upsert consent row and clear opted_out_at
  INSERT INTO ai.beta_consents (
    user_id,
    terms_version,
    accepted_at,
    opted_out_at,
    accepted_metadata
  ) VALUES (
    v_uid,
    p_version,
    now(),
    NULL,
    v_clean_metadata
  )
  ON CONFLICT (user_id, terms_version) DO UPDATE
  SET
    accepted_at = now(),
    opted_out_at = NULL,
    accepted_metadata = EXCLUDED.accepted_metadata;

  RETURN jsonb_build_object(
    'success', true,
    'version', p_version,
    'accepted_at', now()
  );
END;
$$;

COMMENT ON FUNCTION public.accept_ai_beta_terms(text, jsonb) IS 
  'Records user consent to AI beta terms. Validates version against current, upserts row, clears opted_out_at. Metadata is whitelisted (platform, locale, country_header only).';

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
  v_consent_record ai.beta_consents%ROWTYPE;
  v_accepted boolean := false;
  v_accepted_version text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_current_version := ai.current_beta_terms_version();

  -- Check if user has accepted current version and not opted out
  SELECT * INTO v_consent_record
  FROM ai.beta_consents
  WHERE user_id = v_uid
    AND terms_version = v_current_version
  LIMIT 1;

  IF FOUND AND v_consent_record.opted_out_at IS NULL THEN
    v_accepted := true;
    v_accepted_version := v_consent_record.terms_version;
  END IF;

  RETURN jsonb_build_object(
    'accepted', v_accepted,
    'version', v_accepted_version,
    'current', v_current_version
  );
END;
$$;

COMMENT ON FUNCTION public.ai_beta_consent_status() IS 
  'Returns consent status for the calling user: {accepted, version, current}. accepted is true only if the current version is accepted and not opted out.';

-- ---------------------------------------------------------------------------
-- Service-role only helper: Check if a user has consented to a version
-- ---------------------------------------------------------------------------
CREATE FUNCTION ai.has_beta_consent(
  p_user_id uuid,
  p_version text
) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'ai'
    AS $$
DECLARE
  v_has_consent boolean := false;
BEGIN
  -- This function is for service_role only (edge functions, cron jobs)
  -- It checks if a specific user has accepted a specific version and not opted out
  
  SELECT EXISTS (
    SELECT 1
    FROM ai.beta_consents
    WHERE user_id = p_user_id
      AND terms_version = p_version
      AND opted_out_at IS NULL
  ) INTO v_has_consent;

  RETURN v_has_consent;
END;
$$;

COMMENT ON FUNCTION ai.has_beta_consent(uuid, text) IS 
  'Service-role only. Returns true if the specified user has accepted the specified version and not opted out.';

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
