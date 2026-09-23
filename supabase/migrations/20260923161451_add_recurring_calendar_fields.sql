ALTER TABLE public.recurring_transactions
  ADD COLUMN IF NOT EXISTS calendar_type text NOT NULL DEFAULT 'gregorian',
  ADD COLUMN IF NOT EXISTS anchor_month_code text;

DO $constraints$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.recurring_transactions'::regclass
      AND conname = 'recurring_transactions_calendar_type_check'
  ) THEN
    ALTER TABLE public.recurring_transactions
      ADD CONSTRAINT recurring_transactions_calendar_type_check
      CHECK (calendar_type IN ('gregorian', 'hebrew'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.recurring_transactions'::regclass
      AND conname = 'recurring_transactions_anchor_month_code_check'
  ) THEN
    ALTER TABLE public.recurring_transactions
      ADD CONSTRAINT recurring_transactions_anchor_month_code_check
      CHECK (
        anchor_month_code IS NULL
        OR anchor_month_code ~ '^M(0[1-9]|1[0-2])$'
        OR anchor_month_code = 'M05L'
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conrelid = 'public.recurring_transactions'::regclass
      AND conname = 'recurring_transactions_calendar_day_check'
  ) THEN
    ALTER TABLE public.recurring_transactions
      ADD CONSTRAINT recurring_transactions_calendar_day_check
      CHECK (
        (calendar_type = 'gregorian' AND day_of_month BETWEEN 1 AND 31)
        OR (calendar_type = 'hebrew' AND day_of_month BETWEEN 1 AND 30)
      );
  END IF;
END;
$constraints$;

COMMENT ON COLUMN public.recurring_transactions.calendar_type IS
  'Calendar used by monthly and yearly recurrence. Existing rows remain Gregorian through the column default.';
COMMENT ON COLUMN public.recurring_transactions.anchor_month_code IS
  'Stable yearly month intent: M01 through M12, plus Hebrew leap month M05L.';

-- Historical data contains duplicate occurrence identities from the legacy
-- executor. Enforce uniqueness for all newly created occurrences without
-- destructively rewriting those financial records.
CREATE UNIQUE INDEX IF NOT EXISTS
  idx_transactions_recurring_occurrence_future_unique
ON public.transactions (source_recurring_id, occurrence_number)
WHERE source_recurring_id IS NOT NULL
  AND occurrence_number IS NOT NULL
  AND created_at >= TIMESTAMPTZ '2026-09-23 00:00:00+00';

-- Keep the deployed 15-argument overload for older clients. The new overload
-- carries calendar fields without creating a signature race during rollout.
CREATE OR REPLACE FUNCTION public.update_recurring_transaction(
  p_id uuid,
  p_user_id uuid,
  p_amount numeric,
  p_currency text,
  p_description text,
  p_status text,
  p_total_occurrences integer,
  p_day_of_month integer,
  p_payment_method text,
  p_original_amount numeric,
  p_original_currency text,
  p_conversion_rate numeric,
  p_conversion_date date,
  p_rate_source text,
  p_next_due_date date,
  p_calendar_type text,
  p_anchor_month_code text
)
RETURNS SETOF public.recurring_transactions
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  UPDATE public.recurring_transactions AS recurring_row
  SET
    amount = p_amount,
    currency = p_currency,
    description = p_description,
    status = p_status,
    total_occurrences = p_total_occurrences,
    day_of_month = p_day_of_month,
    payment_method = p_payment_method,
    original_amount = p_original_amount,
    original_currency = p_original_currency,
    conversion_rate = p_conversion_rate,
    conversion_date = p_conversion_date,
    rate_source = p_rate_source,
    next_due_date = COALESCE(p_next_due_date, recurring_row.next_due_date),
    calendar_type = p_calendar_type,
    anchor_month_code = p_anchor_month_code,
    updated_at = now()
  WHERE recurring_row.id = p_id
    AND recurring_row.user_id = p_user_id
  RETURNING recurring_row.*;
END;
$function$;

ALTER FUNCTION public.update_recurring_transaction(
  uuid, uuid, numeric, text, text, text, integer, integer, text,
  numeric, text, numeric, date, text, date, text, text
) OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.update_recurring_transaction(
  uuid, uuid, numeric, text, text, text, integer, integer, text,
  numeric, text, numeric, date, text, date, text, text
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.update_recurring_transaction(
  uuid, uuid, numeric, text, text, text, integer, integer, text,
  numeric, text, numeric, date, text, date, text, text
) TO authenticated, service_role;
