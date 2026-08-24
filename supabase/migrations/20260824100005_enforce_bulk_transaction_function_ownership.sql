-- Enforce trusted ownership and least-privilege execution for bulk transaction RPCs.
-- Function bodies and signatures are intentionally unchanged.

DO $preconditions$
DECLARE
  required_signature text;
  required_signatures constant text[] := ARRAY[
    'public.bulk_delete_user_transactions(uuid,uuid[])',
    'public.bulk_update_user_transactions(uuid,uuid[],text,text)',
    'public.bulk_delete_user_recurring_transactions(uuid,uuid[])',
    'public.bulk_update_user_recurring_transactions(uuid,uuid[],text,text)'
  ];
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_roles
    WHERE pg_roles.rolname = 'postgres'
  ) THEN
    RAISE EXCEPTION 'Required trusted function owner role is missing: postgres';
  END IF;

  FOREACH required_signature IN ARRAY required_signatures LOOP
    IF to_regprocedure(required_signature) IS NULL THEN
      RAISE EXCEPTION 'Required function is missing before ownership enforcement: %', required_signature;
    END IF;
  END LOOP;
END;
$preconditions$;

ALTER FUNCTION public.bulk_delete_user_transactions(uuid, uuid[])
  OWNER TO postgres;
ALTER FUNCTION public.bulk_update_user_transactions(uuid, uuid[], text, text)
  OWNER TO postgres;
ALTER FUNCTION public.bulk_delete_user_recurring_transactions(uuid, uuid[])
  OWNER TO postgres;
ALTER FUNCTION public.bulk_update_user_recurring_transactions(uuid, uuid[], text, text)
  OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.bulk_delete_user_transactions(uuid, uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.bulk_update_user_transactions(uuid, uuid[], text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.bulk_delete_user_recurring_transactions(uuid, uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.bulk_update_user_recurring_transactions(uuid, uuid[], text, text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.bulk_delete_user_transactions(uuid, uuid[])
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bulk_update_user_transactions(uuid, uuid[], text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bulk_delete_user_recurring_transactions(uuid, uuid[])
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bulk_update_user_recurring_transactions(uuid, uuid[], text, text)
  TO authenticated, service_role;

DO $postconditions$
DECLARE
  function_oid oid;
  function_owner text;
  execute_grantees text[];
  required_signature text;
  required_signatures constant text[] := ARRAY[
    'public.bulk_delete_user_transactions(uuid,uuid[])',
    'public.bulk_update_user_transactions(uuid,uuid[],text,text)',
    'public.bulk_delete_user_recurring_transactions(uuid,uuid[])',
    'public.bulk_update_user_recurring_transactions(uuid,uuid[],text,text)'
  ];
BEGIN
  FOREACH required_signature IN ARRAY required_signatures LOOP
    function_oid := to_regprocedure(required_signature);

    IF function_oid IS NULL THEN
      RAISE EXCEPTION 'Required function is missing after ownership enforcement: %', required_signature;
    END IF;

    SELECT pg_get_userbyid(pg_proc.proowner)
    INTO function_owner
    FROM pg_proc
    WHERE pg_proc.oid = function_oid;

    IF function_owner IS DISTINCT FROM 'postgres' THEN
      RAISE EXCEPTION 'Function owner is not postgres for %: %', required_signature, function_owner;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE pg_proc.oid = function_oid
        AND pg_proc.prosecdef
    ) THEN
      RAISE EXCEPTION 'Function is SECURITY DEFINER: %', required_signature;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_proc
      CROSS JOIN LATERAL aclexplode(
        coalesce(pg_proc.proacl, acldefault('f', pg_proc.proowner))
      ) AS function_acl
      WHERE pg_proc.oid = function_oid
        AND function_acl.grantee = 0
        AND function_acl.privilege_type = 'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'PUBLIC can execute: %', required_signature;
    END IF;

    IF has_function_privilege('anon', function_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon can execute: %', required_signature;
    END IF;

    IF NOT has_function_privilege('authenticated', function_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated cannot execute: %', required_signature;
    END IF;

    IF NOT has_function_privilege('service_role', function_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role cannot execute: %', required_signature;
    END IF;

    SELECT coalesce(
      array_agg(granted_role.rolname::text ORDER BY granted_role.rolname),
      ARRAY[]::text[]
    )
    INTO execute_grantees
    FROM (
      SELECT DISTINCT function_acl.grantee
      FROM pg_proc
      CROSS JOIN LATERAL aclexplode(
        coalesce(pg_proc.proacl, acldefault('f', pg_proc.proowner))
      ) AS function_acl
      WHERE pg_proc.oid = function_oid
        AND function_acl.grantee <> 0
        AND function_acl.grantee <> pg_proc.proowner
        AND function_acl.privilege_type = 'EXECUTE'
    ) AS execute_acl
    JOIN pg_roles AS granted_role
      ON granted_role.oid = execute_acl.grantee;

    IF execute_grantees IS DISTINCT FROM ARRAY['authenticated', 'service_role']::text[] THEN
      RAISE EXCEPTION 'Unexpected non-owner EXECUTE grantees for %: %',
        required_signature,
        execute_grantees;
    END IF;
  END LOOP;
END;
$postconditions$;
