-- Table to log the outcome of each send-reminder-emails run.
-- Queried by send-new-user-email to include reminder stats in the daily summary.

CREATE TABLE IF NOT EXISTS public.reminder_run_logs (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at          TIMESTAMPTZ NOT NULL    DEFAULT NOW(),
  day_of_month    INTEGER     NOT NULL,
  was_reminder_day BOOLEAN    NOT NULL    DEFAULT false,
  was_shabbat     BOOLEAN     NOT NULL    DEFAULT false,
  users_processed INTEGER     NOT NULL    DEFAULT 0,
  emails_sent     INTEGER     NOT NULL    DEFAULT 0,
  emails_failed   INTEGER     NOT NULL    DEFAULT 0,
  notes           TEXT
);

-- Only the service role (edge functions) may insert/select; no public access.
ALTER TABLE public.reminder_run_logs ENABLE ROW LEVEL SECURITY;

-- No user-facing RLS policy needed — all access is via service_role from edge functions.
