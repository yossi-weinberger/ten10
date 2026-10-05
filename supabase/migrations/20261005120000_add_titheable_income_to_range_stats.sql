-- Adds titheable income for the maaser-year estimate.
-- total_income stays income plus exempt-income for dashboard KPIs.
CREATE OR REPLACE FUNCTION public.get_analytics_range_stats(
  p_start_date text,
  p_end_date text
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH range_data AS (
    SELECT amount, type, is_chomesh
    FROM public.transactions
    WHERE user_id = auth.uid()
      AND date BETWEEN p_start_date::date AND p_end_date::date
  )
  SELECT json_build_object(
    'total_income',              COALESCE(SUM(CASE WHEN type IN ('income', 'exempt-income')        THEN amount ELSE 0 END), 0),
    'titheable_income',          COALESCE(SUM(CASE WHEN type = 'income'                            THEN amount ELSE 0 END), 0),
    'chomesh_amount',            COALESCE(SUM(CASE WHEN is_chomesh = true                          THEN amount ELSE 0 END), 0),
    'total_expenses',            COALESCE(SUM(CASE WHEN type IN ('expense', 'recognized-expense')  THEN amount ELSE 0 END), 0),
    'total_donations',           COALESCE(SUM(CASE WHEN type IN ('donation', 'non_tithe_donation') THEN amount ELSE 0 END), 0),
    'non_tithe_donation_amount', COALESCE(SUM(CASE WHEN type = 'non_tithe_donation'               THEN amount ELSE 0 END), 0)
  )
  FROM range_data;
$$;
