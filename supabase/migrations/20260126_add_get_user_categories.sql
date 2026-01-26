-- Migration: Add function to get distinct user categories by transaction type
-- This function returns all unique categories that a user has used for a specific transaction type

CREATE OR REPLACE FUNCTION get_user_categories(p_type TEXT)
RETURNS TABLE(category TEXT)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t.category
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND t.type = p_type
    AND t.category IS NOT NULL
    AND t.category != ''
  ORDER BY t.category;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_user_categories(TEXT) TO authenticated;

COMMENT ON FUNCTION get_user_categories IS 'Returns distinct categories used by the current user for a specific transaction type';
