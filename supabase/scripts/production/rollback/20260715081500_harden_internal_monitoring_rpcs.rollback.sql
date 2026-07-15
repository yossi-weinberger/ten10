-- Emergency rollback for 20260715081500_harden_internal_monitoring_rpcs.sql.
-- Run only if a known legacy authenticated caller must be restored temporarily.
-- This restores the previous get_slow_queries definition and execute permissions observed before deployment.

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
    FROM pg_stat_statements AS pss
    WHERE pss.mean_exec_time > 1000
    ORDER BY pss.mean_exec_time DESC
    LIMIT 20;
  END IF;
END;
$function$;

COMMENT ON FUNCTION public.get_slow_queries() IS
  'Returns slow queries from pg_stat_statements (requires extension)';

GRANT EXECUTE ON FUNCTION public.get_active_connections() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_slow_queries() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_table_stats() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_tables_without_rls() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_missing_indexes() TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_cron_job_failures(integer) TO PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_reminder_users_with_emails(integer) TO PUBLIC, anon, authenticated, service_role;
