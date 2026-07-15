-- Harden internal monitoring and reminder RPC access.
-- Scope is intentionally limited: no user transaction RPCs, cron definitions, or data changes.

DO $$
BEGIN
  IF to_regprocedure('public.get_active_connections()') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.get_active_connections()';
  END IF;
  IF to_regprocedure('public.get_slow_queries()') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.get_slow_queries()';
  END IF;
  IF to_regprocedure('public.get_table_stats()') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.get_table_stats()';
  END IF;
  IF to_regprocedure('public.get_tables_without_rls()') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.get_tables_without_rls()';
  END IF;
  IF to_regprocedure('public.get_missing_indexes()') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.get_missing_indexes()';
  END IF;
  IF to_regprocedure('public.get_cron_job_failures(integer)') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.get_cron_job_failures(integer)';
  END IF;
  IF to_regprocedure('public.get_reminder_users_with_emails(integer)') IS NULL THEN
    RAISE EXCEPTION 'Missing function public.get_reminder_users_with_emails(integer)';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_slow_queries()
RETURNS TABLE (
  query text,
  calls bigint,
  total_time double precision,
  mean_time double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_extension
    WHERE extname = 'pg_stat_statements'
  ) THEN
    RETURN QUERY
    SELECT
      pss.query,
      pss.calls,
      pss.total_exec_time AS total_time,
      pss.mean_exec_time AS mean_time
    FROM extensions.pg_stat_statements AS pss
    WHERE pss.mean_exec_time > 1000
    ORDER BY pss.mean_exec_time DESC
    LIMIT 20;
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.get_slow_queries() IS
  'Returns slow queries from extensions.pg_stat_statements; callable by service_role only.';

REVOKE ALL ON FUNCTION public.get_active_connections() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_slow_queries() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_table_stats() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_tables_without_rls() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_missing_indexes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_cron_job_failures(integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_reminder_users_with_emails(integer) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.get_active_connections() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_slow_queries() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_table_stats() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_tables_without_rls() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_missing_indexes() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_cron_job_failures(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_reminder_users_with_emails(integer) TO service_role;

DO $$
DECLARE
  function_signature text;
BEGIN
  FOREACH function_signature IN ARRAY ARRAY[
    'public.get_active_connections()',
    'public.get_slow_queries()',
    'public.get_table_stats()',
    'public.get_tables_without_rls()',
    'public.get_missing_indexes()',
    'public.get_cron_job_failures(integer)',
    'public.get_reminder_users_with_emails(integer)'
  ]
  LOOP
    IF has_function_privilege('anon', function_signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon still has EXECUTE on %', function_signature;
    END IF;
    IF has_function_privilege('authenticated', function_signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated still has EXECUTE on %', function_signature;
    END IF;
    IF NOT has_function_privilege('service_role', function_signature, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role lacks EXECUTE on %', function_signature;
    END IF;
  END LOOP;
END;
$$;
