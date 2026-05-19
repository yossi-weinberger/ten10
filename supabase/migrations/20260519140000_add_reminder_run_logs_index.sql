-- Index for the daily summary query: filters by run_at range and orders DESC.
CREATE INDEX IF NOT EXISTS reminder_run_logs_run_at_idx
  ON public.reminder_run_logs (run_at DESC);
