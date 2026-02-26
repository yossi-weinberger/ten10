-- Analytics RPC: Get expenses grouped by category for a date range
CREATE OR REPLACE FUNCTION get_expenses_by_category(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(category TEXT, total_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(t.category, 'uncategorized') AS category,
    SUM(t.amount) AS total_amount
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.type = 'expense'
    AND t.date >= p_start_date
    AND t.date <= p_end_date
  GROUP BY t.category
  ORDER BY total_amount DESC;
END;
$$;

-- Analytics RPC: Get income grouped by category for a date range
CREATE OR REPLACE FUNCTION get_income_by_category(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(category TEXT, total_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(t.category, 'uncategorized') AS category,
    SUM(t.amount) AS total_amount
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.type = 'income'
    AND t.date >= p_start_date
    AND t.date <= p_end_date
  GROUP BY t.category
  ORDER BY total_amount DESC;
END;
$$;

-- Analytics RPC: Get expenses grouped by payment method for a date range
CREATE OR REPLACE FUNCTION get_expenses_by_payment_method(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(payment_method TEXT, total_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(t.payment_method, 'unknown') AS payment_method,
    SUM(t.amount) AS total_amount
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.type = 'expense'
    AND t.date >= p_start_date
    AND t.date <= p_end_date
  GROUP BY t.payment_method
  ORDER BY total_amount DESC;
END;
$$;

-- Analytics RPC: Get daily expenses for heat map
CREATE OR REPLACE FUNCTION get_daily_expenses(
  p_user_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS TABLE(expense_date DATE, total_amount NUMERIC)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.date AS expense_date,
    SUM(t.amount) AS total_amount
  FROM transactions t
  WHERE t.user_id = p_user_id
    AND t.type = 'expense'
    AND t.date >= p_start_date
    AND t.date <= p_end_date
  GROUP BY t.date
  ORDER BY t.date;
END;
$$;
