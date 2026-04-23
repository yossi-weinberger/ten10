-- RPC for send-cron-alerts Edge Function: list pg_cron job runs that failed
-- within the last N hours. Matches supabase/functions/send-cron-alerts/index.ts
-- (CronJobFailure shape and hours_back parameter).

CREATE OR REPLACE FUNCTION public.get_cron_job_failures(
  hours_back integer DEFAULT 24
)
RETURNS TABLE (
  jobid bigint,
  jobname text,
  runid bigint,
  status text,
  return_message text,
  start_time timestamptz,
  end_time timestamptz,
  duration_seconds double precision
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH time_window AS (
    SELECT COALESCE(NULLIF(hours_back, 0), 24) AS hrs
  )
  SELECT
    jrd.jobid,
    COALESCE(j.jobname, '(unknown job)')::text AS jobname,
    jrd.runid,
    jrd.status,
    COALESCE(jrd.return_message, '')::text AS return_message,
    jrd.start_time,
    jrd.end_time,
    CASE
      WHEN jrd.start_time IS NOT NULL AND jrd.end_time IS NOT NULL THEN
        EXTRACT(EPOCH FROM (jrd.end_time - jrd.start_time))::double precision
      ELSE NULL
    END AS duration_seconds
  FROM cron.job_run_details jrd
  LEFT JOIN cron.job j ON j.jobid = jrd.jobid
  CROSS JOIN time_window tw
  WHERE jrd.status = 'failed'
    AND jrd.start_time >= (NOW() - (tw.hrs || ' hours')::interval)
  ORDER BY jrd.start_time DESC;
$$;

COMMENT ON FUNCTION public.get_cron_job_failures(integer) IS
  'Returns failed pg_cron runs in the given time window for send-cron-alerts (service_role only).';

REVOKE ALL ON FUNCTION public.get_cron_job_failures(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cron_job_failures(integer) TO service_role;
