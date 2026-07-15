-- Harden user-facing transaction RPCs without changing their public signatures.
-- SECURITY INVOKER makes the existing transactions and recurring_transactions
-- RLS policies authoritative for authenticated callers, while service_role
-- retains its privileged server-side access.

DO $preconditions$
DECLARE
  required_signature text;
  required_signatures constant text[] := ARRAY[
    'public.delete_user_transaction(uuid,uuid)',
    'public.update_user_transaction(uuid,uuid,jsonb)',
    'public.delete_recurring_transaction(uuid,uuid)',
    'public.update_recurring_transaction(uuid,uuid,numeric,text,text,text,integer,integer,text,numeric,text,numeric,date,text,date)',
    'public.get_user_transactions(uuid,integer,integer,date,date,text[],text,text,text)',
    'public.get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[])',
    'public.get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[],text[])',
    'public.get_user_recurring_transactions(uuid)',
    'public.get_user_recurring_transactions(uuid,text,text)',
    'public.get_user_recurring_transactions(uuid,text,text,text,text[])',
    'public.get_user_recurring_transactions(uuid,text,text,text,text[],text[],date,date,text[])'
  ];
BEGIN
  FOREACH required_signature IN ARRAY required_signatures LOOP
    IF to_regprocedure(required_signature) IS NULL THEN
      RAISE EXCEPTION 'Required function is missing: %', required_signature;
    END IF;
  END LOOP;
END;
$preconditions$;

ALTER FUNCTION public.delete_user_transaction(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.update_user_transaction(uuid, uuid, jsonb) SECURITY INVOKER;
ALTER FUNCTION public.delete_recurring_transaction(uuid, uuid) SECURITY INVOKER;
ALTER FUNCTION public.update_recurring_transaction(
  uuid, uuid, numeric, text, text, text, integer, integer, text,
  numeric, text, numeric, date, text, date
) SECURITY INVOKER;
ALTER FUNCTION public.get_user_transactions(
  uuid, integer, integer, date, date, text[], text, text, text
) SECURITY INVOKER;
ALTER FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[]
) SECURITY INVOKER;
ALTER FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[], text[]
) SECURITY INVOKER;
ALTER FUNCTION public.get_user_recurring_transactions(uuid) SECURITY INVOKER;
ALTER FUNCTION public.get_user_recurring_transactions(uuid, text, text) SECURITY INVOKER;
ALTER FUNCTION public.get_user_recurring_transactions(
  uuid, text, text, text, text[]
) SECURITY INVOKER;
ALTER FUNCTION public.get_user_recurring_transactions(
  uuid, text, text, text, text[], text[], date, date, text[]
) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.delete_user_transaction(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.update_user_transaction(uuid, uuid, jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.delete_recurring_transaction(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.update_recurring_transaction(
  uuid, uuid, numeric, text, text, text, integer, integer, text,
  numeric, text, numeric, date, text, date
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, date, date, text[], text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[]
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[], text[]
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_user_recurring_transactions(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_user_recurring_transactions(uuid, text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_user_recurring_transactions(
  uuid, text, text, text, text[]
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_user_recurring_transactions(
  uuid, text, text, text, text[], text[], date, date, text[]
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.delete_user_transaction(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_user_transaction(uuid, uuid, jsonb)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_recurring_transaction(uuid, uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_recurring_transaction(
  uuid, uuid, numeric, text, text, text, integer, integer, text,
  numeric, text, numeric, date, text, date
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, date, date, text[], text, text, text
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[]
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[], text[]
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_recurring_transactions(uuid)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_recurring_transactions(uuid, text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_recurring_transactions(
  uuid, text, text, text, text[]
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_recurring_transactions(
  uuid, text, text, text, text[], text[], date, date, text[]
) TO authenticated, service_role;

DO $postconditions$
DECLARE
  function_oid oid;
  required_signature text;
  required_signatures constant text[] := ARRAY[
    'public.delete_user_transaction(uuid,uuid)',
    'public.update_user_transaction(uuid,uuid,jsonb)',
    'public.delete_recurring_transaction(uuid,uuid)',
    'public.update_recurring_transaction(uuid,uuid,numeric,text,text,text,integer,integer,text,numeric,text,numeric,date,text,date)',
    'public.get_user_transactions(uuid,integer,integer,date,date,text[],text,text,text)',
    'public.get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[])',
    'public.get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[],text[])',
    'public.get_user_recurring_transactions(uuid)',
    'public.get_user_recurring_transactions(uuid,text,text)',
    'public.get_user_recurring_transactions(uuid,text,text,text,text[])',
    'public.get_user_recurring_transactions(uuid,text,text,text,text[],text[],date,date,text[])'
  ];
BEGIN
  FOREACH required_signature IN ARRAY required_signatures LOOP
    function_oid := to_regprocedure(required_signature);

    IF EXISTS (
      SELECT 1 FROM pg_proc WHERE oid = function_oid AND prosecdef
    ) THEN
      RAISE EXCEPTION 'Function is still SECURITY DEFINER: %', required_signature;
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
  END LOOP;
END;
$postconditions$;
