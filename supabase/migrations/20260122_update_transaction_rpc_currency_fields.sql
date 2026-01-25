-- APPLIED DIRECTLY TO SUPABASE ON 2026-01-22
-- This migration updates the update_user_transaction RPC function to include currency conversion fields
-- and switches the recurring transactions cron job from SQL function to Edge Function

-- 1. Update the update_user_transaction RPC function to allow updating currency conversion fields
CREATE OR REPLACE FUNCTION update_user_transaction(
  p_transaction_id UUID,
  p_user_id UUID,
  p_updates JSONB
)
RETURNS SETOF transactions AS $$
DECLARE
  update_query TEXT;
  allowed_columns TEXT[] := ARRAY[
    'date', 'amount', 'currency', 'description', 'type', 
    'category', 'is_chomesh', 'recipient', 'recurring_total_count',
    'original_amount', 'original_currency', 'conversion_rate', 'conversion_date', 'rate_source'
  ];
  key TEXT;
  value JSONB;
  formatted_value TEXT;
  set_clauses TEXT[] := ARRAY[]::TEXT[];
  updated_row transactions%ROWTYPE;
BEGIN
  FOR key IN SELECT jsonb_object_keys(p_updates) LOOP
    IF key = ANY(allowed_columns) THEN
      value := p_updates -> key;
      IF value IS NULL OR value = 'null'::jsonb THEN
        formatted_value := 'NULL';
      ELSE
        formatted_value := format('%L', value #>> '{}');
      END IF;
      set_clauses := array_append(set_clauses, format('%I = %s', key, formatted_value));
    END IF;
  END LOOP;

  IF array_length(set_clauses, 1) = 0 THEN
    RAISE EXCEPTION 'No valid fields provided for update.';
  END IF;

  set_clauses := array_append(set_clauses, format('%I = %L', 'updated_at', now()));

  update_query := 'UPDATE public.transactions SET ' || array_to_string(set_clauses, ', ') ||
                  ' WHERE id = $1 AND user_id = $2 RETURNING *;';

  EXECUTE update_query
  INTO updated_row
  USING p_transaction_id, p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction ID % not found for user ID % or no valid fields to update.', p_transaction_id, p_user_id;
  END IF;
  
  RETURN NEXT updated_row;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Switch the recurring transactions cron job to use Edge Function instead of SQL function
-- The Edge Function 'process-recurring-transactions' handles currency conversion properly
-- First, remove the old cron job
SELECT cron.unschedule('daily-recurring-executor');

-- Then, create the new cron job that calls the Edge Function
SELECT cron.schedule(
  'daily-recurring-executor',
  '0 0 * * *',
  $$
  SELECT net.http_post(
    url := 'https://flpzqbvbymoluoeeeofg.supabase.co/functions/v1/process-recurring-transactions',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
