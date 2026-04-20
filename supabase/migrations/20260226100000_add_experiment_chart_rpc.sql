-- Experiment: RPC for branch workflow testing (chart data).
-- Returns mock series for the experiment chart. Safe to drop when experiment ends.

CREATE OR REPLACE FUNCTION get_experiment_chart_data(p_user_id UUID)
RETURNS TABLE(label TEXT, value NUMERIC)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Mock data for experiment chart (no real table dependency)
  RETURN QUERY
  SELECT * FROM (VALUES
    ('Jan', 12),
    ('Feb', 19),
    ('Mar', 15),
    ('Apr', 22),
    ('May', 18)
  ) AS t(label, value);
END;
$$;

GRANT EXECUTE ON FUNCTION get_experiment_chart_data(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_experiment_chart_data(UUID) TO service_role;

COMMENT ON FUNCTION get_experiment_chart_data IS 'Experiment: returns mock chart data for branch workflow testing';
