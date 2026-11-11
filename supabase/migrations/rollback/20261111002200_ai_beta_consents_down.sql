-- Rollback for 20261111002200_ai_beta_consents.sql
-- Drops the beta consent table, RPCs, and version function.
-- After running: supabase migration repair --status reverted 20261111002200

SET check_function_bodies = false;

-- ---------------------------------------------------------------------------
-- Drop public RPCs
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
-- Drop consent table
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS ai.beta_consents;

RESET check_function_bodies;
