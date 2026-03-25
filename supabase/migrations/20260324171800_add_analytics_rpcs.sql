-- Analytics RPCs for the Analytics page
-- All functions: SECURITY DEFINER SET search_path = public, use auth.uid() internally
-- Zero schema changes — SELECT only on existing tables

-- ============================================================
-- 1. Category breakdown by type and date range
-- p_type: 'expense' -> includes recognized-expense
--         'income'  -> includes exempt-income
--         'donation'-> includes non_tithe_donation
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
        ELSE ARRAY[p_type]
      END
    )
  GROUP BY COALESCE(t.category, 'other')
  ORDER BY SUM(t.amount) DESC
  LIMIT 10;
$$;

-- ============================================================
-- 2. Recurring transactions forecast (active only)
-- Queries recurring_transactions (not transactions)
-- amount is already in default currency (conversion already applied)
-- ============================================================
CREATE OR REPLACE FUNCTION get_recurring_forecast()
RETURNS TABLE(type text, total_amount numeric, tx_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    rt.type,
    SUM(rt.amount) AS total_amount,
    COUNT(*)       AS tx_count
  FROM recurring_transactions rt
  WHERE rt.user_id = auth.uid()
    AND rt.status = 'active'
  GROUP BY rt.type;
$$;

-- ============================================================
-- 3. Payment method breakdown (expenses only, date range)
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
  ORDER BY SUM(t.amount) DESC;
$$;

-- ============================================================
-- 4. Recurring vs one-time transactions (excludes initial_balance)
-- is_recurring = true  -> generated from a recurring definition
-- is_recurring = false -> manually entered one-time transaction
-- ============================================================
CREATE OR REPLACE FUNCTION get_recurring_vs_onetime(
  p_start_date text,
  p_end_date   text
)
RETURNS TABLE(is_recurring boolean, total_amount numeric, tx_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (t.source_recurring_id IS NOT NULL) AS is_recurring,
    SUM(t.amount)                        AS total_amount,
    COUNT(*)                             AS tx_count
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.date BETWEEN p_start_date::date AND p_end_date::date
    AND t.type NOT IN ('initial_balance')
  GROUP BY (t.source_recurring_id IS NOT NULL);
$$;

-- ============================================================
-- 5. Donation recipients breakdown (date range)
-- ============================================================
CREATE OR REPLACE FUNCTION get_donation_recipients_breakdown(
  p_start_date text,
  p_end_date   text
)
RETURNS TABLE(recipient text, total_amount numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(t.recipient, 'other') AS recipient,
    SUM(t.amount)                   AS total_amount
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.date BETWEEN p_start_date::date AND p_end_date::date
    AND t.type IN ('donation', 'non_tithe_donation')
  GROUP BY COALESCE(t.recipient, 'other')
  ORDER BY SUM(t.amount) DESC
  LIMIT 10;
$$;
