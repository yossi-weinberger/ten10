-- Rollback for 20261111180000_ai_has_current_beta_consent.sql
-- After running: supabase migration repair --status reverted 20261111180000

DROP FUNCTION IF EXISTS public.ai_has_current_beta_consent(uuid);
