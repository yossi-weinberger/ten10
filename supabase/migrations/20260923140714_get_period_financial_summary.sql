CREATE OR REPLACE FUNCTION public.get_period_financial_summary(
  p_user_id uuid,
  p_boundaries date[]
)
RETURNS TABLE (
  period_index bigint,
  period_start date,
  period_end date,
  income numeric,
  donations numeric,
  expenses numeric
)
LANGUAGE sql
STABLE
SET search_path = pg_catalog, public
AS $$
  WITH boundary_rows AS (
    SELECT
      boundary_date AS period_start,
      LEAD(boundary_date) OVER (ORDER BY ordinality) AS period_end,
      ordinality AS period_index
    FROM unnest(p_boundaries) WITH ORDINALITY
      AS boundaries(boundary_date, ordinality)
  ),
  periods AS (
    SELECT period_index, period_start, period_end
    FROM boundary_rows
    WHERE period_end IS NOT NULL
      AND period_start < period_end
      AND p_user_id = auth.uid()
  )
  SELECT
    p.period_index,
    p.period_start,
    p.period_end,
    COALESCE(
      SUM(t.amount) FILTER (
        WHERE t.type IN ('income', 'exempt-income')
      ),
      0
    ) AS income,
    COALESCE(
      SUM(t.amount) FILTER (
        WHERE t.type IN ('donation', 'non_tithe_donation')
      ),
      0
    ) AS donations,
    COALESCE(
      SUM(t.amount) FILTER (
        WHERE t.type IN ('expense', 'recognized-expense')
      ),
      0
    ) AS expenses
  FROM periods p
  LEFT JOIN public.transactions t
    ON t.user_id = p_user_id
   AND t.date >= p.period_start
   AND t.date < p.period_end
  GROUP BY p.period_index, p.period_start, p.period_end
  ORDER BY p.period_index;
$$;

REVOKE ALL ON FUNCTION get_period_financial_summary(uuid, date[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION get_period_financial_summary(uuid, date[]) FROM anon;
GRANT EXECUTE ON FUNCTION get_period_financial_summary(uuid, date[]) TO authenticated;
