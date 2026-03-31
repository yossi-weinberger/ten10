-- Transaction activity heatmap RPC
-- Returns daily transaction counts and amounts for the calendar heatmap component
-- Uses auth.uid() internally — no p_user_id parameter (security: same pattern as other analytics RPCs)

CREATE OR REPLACE FUNCTION get_daily_transaction_heatmap(
  p_start_date text,
  p_end_date   text
)
RETURNS TABLE(
  tx_date     text,
  tx_count    integer,
  total_amount numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date::text         AS tx_date,
    COUNT(*)::integer  AS tx_count,
    SUM(amount)        AS total_amount
  FROM transactions
  WHERE user_id = auth.uid()
    AND date BETWEEN p_start_date::date AND p_end_date::date
    AND type NOT IN ('initial_balance')
  GROUP BY date
  ORDER BY date;
$$;
