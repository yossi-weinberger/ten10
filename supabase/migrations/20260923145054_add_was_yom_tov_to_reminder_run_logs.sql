ALTER TABLE public.reminder_run_logs
  ADD COLUMN IF NOT EXISTS was_yom_tov BOOLEAN NOT NULL DEFAULT false;
