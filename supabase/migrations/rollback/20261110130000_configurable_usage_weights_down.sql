-- Rollback for 20261110130000_configurable_usage_weights.sql
-- Restores the original hardcoded ai.usage_weight function and drops the configuration table.

SET check_function_bodies = false;

-- ---------------------------------------------------------------------------
-- Restore original ai.usage_weight function
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION ai.usage_weight(p_kind text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE p_kind WHEN 'receipt' THEN 5 WHEN 'speech' THEN 3 WHEN 'text' THEN 1 END;
$$;

-- ---------------------------------------------------------------------------
-- Drop the configuration table
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS public.ai_usage_weights CASCADE;
