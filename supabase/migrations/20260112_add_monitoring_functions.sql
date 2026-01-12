-- Monitoring Functions for Admin Dashboard
-- Run this migration to enable system monitoring capabilities

-- Function to get active database connections count
CREATE OR REPLACE FUNCTION get_active_connections()
RETURNS TABLE(count integer) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT COUNT(*)::integer AS count
  FROM pg_stat_activity
  WHERE state = 'active';
END;
$$;

-- Function to get slow queries from pg_stat_statements
-- Requires pg_stat_statements extension to be enabled
CREATE OR REPLACE FUNCTION get_slow_queries()
RETURNS TABLE(
  query text,
  calls bigint,
  total_time double precision,
  mean_time double precision
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  -- Check if pg_stat_statements extension exists
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements'
  ) THEN
    RETURN QUERY
    SELECT 
      pss.query,
      pss.calls,
      pss.total_exec_time as total_time,
      pss.mean_exec_time as mean_time
    FROM pg_stat_statements pss
    WHERE pss.mean_exec_time > 1000 -- queries taking more than 1 second on average
    ORDER BY pss.mean_exec_time DESC
    LIMIT 20;
  ELSE
    -- Return empty if extension not available
    RETURN;
  END IF;
END;
$$;

-- Function to get table statistics
CREATE OR REPLACE FUNCTION get_table_stats()
RETURNS TABLE(
  table_name text,
  row_count bigint,
  seq_scans bigint,
  index_scans bigint,
  dead_tuples bigint
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || relname as table_name,
    n_live_tup as row_count,
    seq_scan as seq_scans,
    idx_scan as index_scans,
    n_dead_tup as dead_tuples
  FROM pg_stat_user_tables
  WHERE schemaname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  ORDER BY n_live_tup DESC
  LIMIT 50;
END;
$$;

-- Function to find tables without Row Level Security
CREATE OR REPLACE FUNCTION get_tables_without_rls()
RETURNS TABLE(
  schema_name text,
  table_name text
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname::text as schema_name,
    tablename::text as table_name
  FROM pg_tables t
  LEFT JOIN pg_class c ON c.relname = t.tablename
  LEFT JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
  WHERE t.schemaname = 'public'
    AND NOT c.relrowsecurity
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE '_prisma_%'
  ORDER BY t.tablename;
END;
$$;

-- Function to identify potential missing indexes
-- Tables with high seq_scan ratio compared to index scans
CREATE OR REPLACE FUNCTION get_missing_indexes()
RETURNS TABLE(
  table_name text,
  column_name text,
  seq_scan_ratio numeric
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    schemaname || '.' || relname as table_name,
    'multiple columns' as column_name,
    CASE 
      WHEN (seq_scan + idx_scan) > 0 
      THEN ROUND((seq_scan::numeric / (seq_scan + idx_scan)::numeric) * 100, 2)
      ELSE 0 
    END as seq_scan_ratio
  FROM pg_stat_user_tables
  WHERE seq_scan > idx_scan
    AND seq_scan > 100 -- Only tables with significant scans
    AND n_live_tup > 1000 -- Only tables with significant rows
  ORDER BY seq_scan_ratio DESC
  LIMIT 10;
END;
$$;

-- Grant execute permissions to authenticated users (admin check is in Edge Function)
GRANT EXECUTE ON FUNCTION get_active_connections() TO authenticated;
GRANT EXECUTE ON FUNCTION get_slow_queries() TO authenticated;
GRANT EXECUTE ON FUNCTION get_table_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION get_tables_without_rls() TO authenticated;
GRANT EXECUTE ON FUNCTION get_missing_indexes() TO authenticated;

-- Also grant to service_role for Edge Function usage
GRANT EXECUTE ON FUNCTION get_active_connections() TO service_role;
GRANT EXECUTE ON FUNCTION get_slow_queries() TO service_role;
GRANT EXECUTE ON FUNCTION get_table_stats() TO service_role;
GRANT EXECUTE ON FUNCTION get_tables_without_rls() TO service_role;
GRANT EXECUTE ON FUNCTION get_missing_indexes() TO service_role;

COMMENT ON FUNCTION get_active_connections IS 'Returns count of active database connections for monitoring';
COMMENT ON FUNCTION get_slow_queries IS 'Returns slow queries from pg_stat_statements (requires extension)';
COMMENT ON FUNCTION get_table_stats IS 'Returns table statistics including row counts and scan types';
COMMENT ON FUNCTION get_tables_without_rls IS 'Returns list of public tables without RLS enabled';
COMMENT ON FUNCTION get_missing_indexes IS 'Returns tables with high sequential scan ratio suggesting missing indexes';
