-- Drop dead shadow RPCs (no callers verified in src, supabase/functions, scripts, tests)
-- Original definitions: supabase/migrations/20261103100000_ai_intake.sql
-- read_ai_shadow_type_context (~line 2520), record_ai_shadow_category (~line 2581), record_ai_shadow_type (~line 2653)

DROP FUNCTION IF EXISTS public.read_ai_shadow_type_context(uuid);
DROP FUNCTION IF EXISTS public.record_ai_shadow_category(uuid, uuid, text, numeric);
DROP FUNCTION IF EXISTS public.record_ai_shadow_type(uuid, uuid, text, numeric);
