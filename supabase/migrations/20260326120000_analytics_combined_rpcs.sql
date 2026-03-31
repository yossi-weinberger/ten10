-- Analytics combined RPCs: reduce round-trips from 9 HTTP requests to 4
-- per date-range change.
--
-- New functions:
--   get_analytics_breakdowns  — payment_methods + recurring_vs_onetime + recipients
--   get_analytics_range_stats — income + chomesh + expenses + donations
--
-- Both use auth.uid() internally (consistent with newer analytics RPCs).
-- Both use a single CTE scan of the transactions table.
-- Existing RPCs are unchanged.

-- ============================================================
-- 1. Combined breakdowns
--    Returns payment_methods, recurring_vs_onetime, recipients as JSON.
--    CTE scans transactions once for the date range.
-- ============================================================
CREATE OR REPLACE FUNCTION get_analytics_breakdowns(
  p_start_date text,
  p_end_date   text
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT amount, type, payment_method, source_recurring_id, description, recipient
    FROM transactions
    WHERE user_id = auth.uid()
      AND date BETWEEN p_start_date::date AND p_end_date::date
      AND type != 'initial_balance'
  )
  SELECT json_build_object(
    'payment_methods', (
      SELECT COALESCE(json_agg(r ORDER BY r.total_amount DESC), '[]'::json)
      FROM (
        SELECT COALESCE(payment_method, 'other') AS payment_method,
               SUM(amount) AS total_amount
        FROM base
        WHERE type IN ('expense', 'recognized-expense')
        GROUP BY COALESCE(payment_method, 'other')
        ORDER BY SUM(amount) DESC
        LIMIT 20
      ) r
    ),
    'recurring_vs_onetime', (
      SELECT COALESCE(json_agg(r), '[]'::json)
      FROM (
        SELECT (source_recurring_id IS NOT NULL) AS is_recurring,
               SUM(amount) AS total_amount,
               COUNT(*) AS tx_count
        FROM base
        GROUP BY (source_recurring_id IS NOT NULL)
      ) r
    ),
    'recipients', (
      SELECT COALESCE(json_agg(r ORDER BY r.total_amount DESC), '[]'::json)
      FROM (
        SELECT sub.display_key AS recipient,
               sub.total_amount,
               sub.display_key AS last_description
        FROM (
          SELECT
            COALESCE(NULLIF(TRIM(description), ''), NULLIF(TRIM(recipient), ''), 'other') AS display_key,
            SUM(amount) AS total_amount
          FROM base
          WHERE type IN ('donation', 'non_tithe_donation')
          GROUP BY COALESCE(NULLIF(TRIM(description), ''), NULLIF(TRIM(recipient), ''), 'other')
          ORDER BY SUM(amount) DESC
          LIMIT 50
        ) sub
        ORDER BY sub.total_amount DESC
      ) r
    )
  );
$$;

-- ============================================================
-- 2. Combined range stats
--    Returns income/chomesh/expenses/donations totals as JSON.
--    CTE scans transactions once for the date range.
--    chomesh uses the per-transaction is_chomesh flag (same as desktop).
-- ============================================================
CREATE OR REPLACE FUNCTION get_analytics_range_stats(
  p_start_date text,
  p_end_date   text
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH range_data AS (
    SELECT amount, type, is_chomesh
    FROM transactions
    WHERE user_id = auth.uid()
      AND date BETWEEN p_start_date::date AND p_end_date::date
  )
  SELECT json_build_object(
    'total_income',              COALESCE(SUM(CASE WHEN type IN ('income', 'exempt-income')        THEN amount ELSE 0 END), 0),
    'chomesh_amount',            COALESCE(SUM(CASE WHEN is_chomesh = true                          THEN amount ELSE 0 END), 0),
    'total_expenses',            COALESCE(SUM(CASE WHEN type IN ('expense', 'recognized-expense')  THEN amount ELSE 0 END), 0),
    'total_donations',           COALESCE(SUM(CASE WHEN type IN ('donation', 'non_tithe_donation') THEN amount ELSE 0 END), 0),
    'non_tithe_donation_amount', COALESCE(SUM(CASE WHEN type = 'non_tithe_donation'               THEN amount ELSE 0 END), 0)
  )
  FROM range_data;
$$;

-- ============================================================
-- 3. Grants
-- ============================================================
GRANT EXECUTE ON FUNCTION get_analytics_breakdowns(text, text)  TO authenticated;
GRANT EXECUTE ON FUNCTION get_analytics_range_stats(text, text) TO authenticated;

-- ============================================================
-- 4. Partial indexes for type-filtered analytics queries
--    These make expense and donation range scans faster by
--    narrowing the index to only relevant rows.
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date_expense
  ON transactions (user_id, date)
  WHERE type IN ('expense', 'recognized-expense');

CREATE INDEX IF NOT EXISTS idx_transactions_user_date_donation
  ON transactions (user_id, date)
  WHERE type IN ('donation', 'non_tithe_donation');
