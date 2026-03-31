-- Analytics performance hardening:
--   1. Composite index on transactions(user_id, date) for range scans
--   2. get_category_breakdown: close the ELSE fallback (whitelist only)
--   3. get_payment_method_breakdown: add LIMIT 20
--   4. GRANT EXECUTE on all analytics RPCs to authenticated

-- ============================================================
-- 1. Index: analytics queries filter on (user_id, date) for every user
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_transactions_user_date
  ON transactions (user_id, date DESC);

-- ============================================================
-- 2. get_category_breakdown: replace open ELSE ARRAY[p_type]
--    with ELSE ARRAY[]::text[] so unknown p_type values return
--    empty results instead of leaking arbitrary type strings into the query.
-- ============================================================
CREATE OR REPLACE FUNCTION get_category_breakdown(
  p_start_date text,
  p_end_date   text,
  p_type       text DEFAULT 'expense'
)
RETURNS TABLE(category text, total_amount numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(t.category, 'other') AS category,
    SUM(t.amount)                 AS total_amount
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.date BETWEEN p_start_date::date AND p_end_date::date
    AND t.type = ANY(
      CASE p_type
        WHEN 'expense'  THEN ARRAY['expense', 'recognized-expense']
        WHEN 'income'   THEN ARRAY['income', 'exempt-income']
        WHEN 'donation' THEN ARRAY['donation', 'non_tithe_donation']
        ELSE ARRAY[]::text[]
      END
    )
  GROUP BY COALESCE(t.category, 'other')
  ORDER BY SUM(t.amount) DESC
  LIMIT 10;
$$;

-- ============================================================
-- 3. get_payment_method_breakdown: add LIMIT 20 for consistency
--    with other breakdown RPCs and to cap response size.
-- ============================================================
CREATE OR REPLACE FUNCTION get_payment_method_breakdown(
  p_start_date text,
  p_end_date   text
)
RETURNS TABLE(payment_method text, total_amount numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(t.payment_method, 'other') AS payment_method,
    SUM(t.amount)                        AS total_amount
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.date BETWEEN p_start_date::date AND p_end_date::date
    AND t.type IN ('expense', 'recognized-expense')
  GROUP BY COALESCE(t.payment_method, 'other')
  ORDER BY SUM(t.amount) DESC
  LIMIT 20;
$$;

-- ============================================================
-- 4. GRANT EXECUTE on all analytics RPCs to authenticated role
-- ============================================================
GRANT EXECUTE ON FUNCTION get_category_breakdown(text, text, text)             TO authenticated;
GRANT EXECUTE ON FUNCTION get_recurring_forecast()                              TO authenticated;
GRANT EXECUTE ON FUNCTION get_payment_method_breakdown(text, text)             TO authenticated;
GRANT EXECUTE ON FUNCTION get_recurring_vs_onetime(text, text)                 TO authenticated;
GRANT EXECUTE ON FUNCTION get_donation_recipients_breakdown(text, text)        TO authenticated;
GRANT EXECUTE ON FUNCTION get_daily_transaction_heatmap(text, text, text)      TO authenticated;
