ALTER TABLE public.recurring_transactions
  DROP CONSTRAINT IF EXISTS recurring_transactions_anchor_month_code_check;

ALTER TABLE public.recurring_transactions
  ADD CONSTRAINT recurring_transactions_anchor_month_code_check
  CHECK (
    anchor_month_code IS NULL
    OR (
      calendar_type = 'gregorian'
      AND anchor_month_code ~ '^M(0[1-9]|1[0-2])$'
    )
    OR (
      calendar_type = 'hebrew'
      AND (
        anchor_month_code ~ '^M(0[1-9]|1[0-2])$'
        OR anchor_month_code = 'M05L'
      )
    )
  );
