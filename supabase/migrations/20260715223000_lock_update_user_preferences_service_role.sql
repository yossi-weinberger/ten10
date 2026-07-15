-- Phase 2: lock update_user_preferences to service_role only.
-- Prerequisite: Phase 1 is live (verify-unsubscribe-token verifies JWT and
-- applies this RPC with SUPABASE_SERVICE_ROLE_KEY; browser must not call it).

DO $$
BEGIN
  IF to_regprocedure('public.update_user_preferences(uuid, boolean, boolean)') IS NULL THEN
    RAISE EXCEPTION
      'Missing function public.update_user_preferences(uuid, boolean, boolean)';
  END IF;
END;
$$;

COMMENT ON FUNCTION public.update_user_preferences(uuid, boolean, boolean) IS
  'SECURITY DEFINER preference update for unsubscribe Edge Function; executable by service_role only.';

REVOKE ALL ON FUNCTION public.update_user_preferences(uuid, boolean, boolean)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_user_preferences(uuid, boolean, boolean)
  TO service_role;

DO $$
DECLARE
  function_signature text :=
    'public.update_user_preferences(uuid, boolean, boolean)';
BEGIN
  IF to_regprocedure(function_signature) IS NULL THEN
    RAISE EXCEPTION 'Missing function % after grant changes', function_signature;
  END IF;

  IF has_function_privilege('anon', function_signature, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon still has EXECUTE on %', function_signature;
  END IF;

  IF has_function_privilege('authenticated', function_signature, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated still has EXECUTE on %', function_signature;
  END IF;

  IF NOT has_function_privilege('service_role', function_signature, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role lacks EXECUTE on %', function_signature;
  END IF;
END;
$$;
