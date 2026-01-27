/**
 * Script to check CRON jobs status and execution history
 * Run with: node scripts/check-cron-jobs.js
 */

// This script requires direct database access or Supabase client
// For now, it provides SQL queries that can be run in Supabase SQL Editor

console.log("=== CRON Jobs Status Check ===\n");

console.log("1. Check active CRON jobs:");
console.log(`
SELECT 
  jobid, 
  jobname, 
  schedule, 
  active,
  nodename,
  nodeport
FROM cron.job
WHERE jobname IN ('send-reminder-emails', 'daily-recurring-executor')
ORDER BY jobname;
`);

console.log("\n2. Check execution history for send-reminder-emails:");
console.log(`
SELECT 
  jobid,
  jobname,
  runid,
  status,
  return_message,
  start_time,
  end_time,
  CASE 
    WHEN end_time IS NOT NULL AND start_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (end_time - start_time))
    ELSE NULL
  END as duration_seconds
FROM cron.job_run_details
WHERE jobname = 'send-reminder-emails'
ORDER BY start_time DESC
LIMIT 10;
`);

console.log("\n3. Check execution history for daily-recurring-executor:");
console.log(`
SELECT 
  jobid,
  jobname,
  runid,
  status,
  return_message,
  start_time,
  end_time,
  CASE 
    WHEN end_time IS NOT NULL AND start_time IS NOT NULL
    THEN EXTRACT(EPOCH FROM (end_time - start_time))
    ELSE NULL
  END as duration_seconds
FROM cron.job_run_details
WHERE jobname = 'daily-recurring-executor'
ORDER BY start_time DESC
LIMIT 10;
`);

console.log("\n4. Summary of both jobs (last 7 days):");
console.log(`
SELECT 
  jobname,
  COUNT(*) as total_runs,
  COUNT(*) FILTER (WHERE status = 'succeeded') as successful_runs,
  COUNT(*) FILTER (WHERE status = 'failed') as failed_runs,
  MAX(start_time) as last_run_time,
  MIN(start_time) as first_run_time,
  AVG(EXTRACT(EPOCH FROM (end_time - start_time))) FILTER (WHERE end_time IS NOT NULL) as avg_duration_seconds
FROM cron.job_run_details
WHERE jobname IN ('send-reminder-emails', 'daily-recurring-executor')
  AND start_time >= NOW() - INTERVAL '7 days'
GROUP BY jobname
ORDER BY jobname;
`);

console.log("\n=== Instructions ===");
console.log(
  "Run these queries in Supabase SQL Editor to check CRON jobs status.",
);
console.log("Or use Supabase CLI: supabase functions logs <function-name>");
