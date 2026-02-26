-- Migration: Update get_user_categories to include derived types
-- This ensures categories are shared across base and derived types
-- e.g., querying for 'income' also returns categories from 'exempt-income'

CREATE OR REPLACE FUNCTION get_user_categories(p_type TEXT)
RETURNS TABLE(category TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  types_to_query TEXT[];
BEGIN
  -- Map base type to include its derived types
  -- This ensures exempt-income transactions show income categories and vice versa
  IF p_type = 'income' THEN
    types_to_query := ARRAY['income', 'exempt-income'];
  ELSIF p_type = 'expense' THEN
    types_to_query := ARRAY['expense', 'recognized-expense'];
  ELSIF p_type = 'donation' THEN
    types_to_query := ARRAY['donation', 'non_tithe_donation'];
  ELSE
    -- For any other type (or derived types passed directly), just use that type
    types_to_query := ARRAY[p_type];
  END IF;

  RETURN QUERY
  SELECT DISTINCT t.category
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.type = ANY(types_to_query)
    AND t.category IS NOT NULL
    AND t.category != ''
  ORDER BY t.category;
END;
$$;

COMMENT ON FUNCTION get_user_categories IS 'Returns distinct categories used by the current user for a transaction type (including derived types)';
