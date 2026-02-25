-- Experiment for branch workflow: RPC used by a chart on the home page.
-- Safe to run on production; returns per-month transaction counts for the user.

CREATE OR REPLACE FUNCTION get_experiment_chart_data(p_user_id UUID)
RETURNS TABLE(label TEXT, value NUMERIC)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    to_char(date_trunc('month', date::date), 'YYYY-MM') AS label,
    COUNT(*)::numeric AS value
  FROM public.transactions
  WHERE user_id = p_user_id
    AND date >= (CURRENT_DATE - INTERVAL '6 months')
  GROUP BY date_trunc('month', date::date)
  ORDER BY 1;
$$;

GRANT EXECUTE ON FUNCTION get_experiment_chart_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_experiment_chart_data(UUID) TO service_role;

COMMENT ON FUNCTION get_experiment_chart_data IS 'Returns monthly transaction counts for the last 6 months (branch experiment chart).';
