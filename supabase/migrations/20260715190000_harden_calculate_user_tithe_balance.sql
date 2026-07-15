-- Harden calculate_user_tithe_balance without changing its public signature.
-- Authenticated callers may only compute their own balance (auth.uid() = p_user_id).
-- service_role (reminder Edge Function) may compute for any user.
-- Remains SECURITY DEFINER so service_role and privileged paths keep working.

DO $preconditions$
BEGIN
  IF to_regprocedure('public.calculate_user_tithe_balance(uuid)') IS NULL THEN
    RAISE EXCEPTION 'Required function is missing: public.calculate_user_tithe_balance(uuid)';
  END IF;
END;
$preconditions$;

CREATE OR REPLACE FUNCTION public.calculate_user_tithe_balance(p_user_id uuid)
RETURNS TABLE(
  total_balance double precision,
  maaser_balance double precision,
  chomesh_balance double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_total double precision := 0;
  v_maaser double precision := 0;
  v_chomesh double precision := 0;
  rec RECORD;
BEGIN
  IF auth.role() <> 'service_role'
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  FOR rec IN SELECT type, amount, is_chomesh
             FROM transactions
             WHERE user_id = p_user_id
  LOOP
    IF rec.type = 'income' THEN
      v_maaser := v_maaser + (rec.amount * 0.1);
      IF rec.is_chomesh THEN
        v_chomesh := v_chomesh + (rec.amount * 0.1);
      END IF;
    ELSIF rec.type = 'donation' THEN
      IF rec.is_chomesh THEN
        v_chomesh := v_chomesh - rec.amount;
      ELSE
        v_maaser := v_maaser - rec.amount;
      END IF;
    ELSIF rec.type = 'recognized-expense' THEN
      v_maaser := v_maaser - (rec.amount * 0.1);
      IF rec.is_chomesh THEN
        v_chomesh := v_chomesh - (rec.amount * 0.1);
      END IF;
    ELSIF rec.type = 'initial_balance' THEN
      IF rec.is_chomesh THEN
        v_chomesh := v_chomesh + rec.amount;
      ELSE
        v_maaser := v_maaser + rec.amount;
      END IF;
    END IF;
  END LOOP;

  v_total := v_maaser + v_chomesh;
  RETURN QUERY SELECT v_total, v_maaser, v_chomesh;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.calculate_user_tithe_balance(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.calculate_user_tithe_balance(uuid)
  TO authenticated, service_role;

DO $postconditions$
DECLARE
  function_oid oid;
  required_signature constant text := 'public.calculate_user_tithe_balance(uuid)';
  function_def text;
BEGIN
  function_oid := to_regprocedure(required_signature);

  IF function_oid IS NULL THEN
    RAISE EXCEPTION 'Required function is missing: %', required_signature;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc WHERE oid = function_oid AND prosecdef
  ) THEN
    RAISE EXCEPTION 'Function must remain SECURITY DEFINER: %', required_signature;
  END IF;

  function_def := pg_get_functiondef(function_oid);
  IF position('Access denied' IN function_def) = 0
     OR position('auth.role()' IN function_def) = 0
     OR position('auth.uid()' IN function_def) = 0 THEN
    RAISE EXCEPTION 'Function is missing auth guard: %', required_signature;
  END IF;

  IF has_function_privilege('anon', function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'anon can still execute: %', required_signature;
  END IF;

  IF NOT has_function_privilege('authenticated', function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'authenticated cannot execute: %', required_signature;
  END IF;

  IF NOT has_function_privilege('service_role', function_oid, 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role cannot execute: %', required_signature;
  END IF;
END;
$postconditions$;
