-- Recreate the two legacy public.get_user_transactions overloads dropped by
-- 20261112110000_drop_legacy_get_user_transactions_overloads.sql.
--
-- Bodies are the 2026-10-18 pg_get_functiondef capture. No later migration
-- replaces these overloads. search_path is part of that capture.
-- SECURITY INVOKER and the EXECUTE grants are the last settings applied to
-- these signatures, in 20260715090000_harden_user_transaction_rpcs.sql:
-- PUBLIC and anon cannot execute; authenticated and service_role can.

CREATE OR REPLACE FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer DEFAULT 0, p_limit integer DEFAULT 20, p_date_from date DEFAULT NULL::date, p_date_to date DEFAULT NULL::date, p_types text[] DEFAULT NULL::text[], p_search text DEFAULT NULL::text, p_sort_field text DEFAULT 'created_at'::text, p_sort_direction text DEFAULT 'desc'::text)
 RETURNS TABLE(transactions jsonb, total_count integer)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
    v_total_count integer;
BEGIN
    -- First, get the total count based on the filters
    SELECT COUNT(*)
    INTO v_total_count
    FROM transactions t
    WHERE t.user_id = p_user_id
      AND (p_date_from IS NULL OR t.date >= p_date_from)
      AND (p_date_to IS NULL OR t.date <= p_date_to)
      AND (p_types IS NULL OR t.type = ANY(p_types))
      AND (p_search IS NULL OR
           (t.description ILIKE '%' || p_search || '%' OR
            t.category ILIKE '%' || p_search || '%' OR
            t.recipient ILIKE '%' || p_search || '%'));

    -- Then, get the paginated and joined data
    RETURN QUERY
    SELECT
      jsonb_agg(t_data) as transactions,
      v_total_count as total_count
    FROM (
      SELECT
        t.*,
        CASE
          WHEN rt.id IS NOT NULL THEN
            jsonb_build_object(
              'id', rt.id,
              'frequency', rt.frequency,
              'status', rt.status,
              'execution_count', rt.execution_count,
              'total_occurrences', rt.total_occurrences,
              'day_of_month', rt.day_of_month
            )
          ELSE
            NULL
        END as recurring_info
      FROM transactions t
      LEFT JOIN recurring_transactions rt ON t.source_recurring_id = rt.id
      WHERE t.user_id = p_user_id
        AND (p_date_from IS NULL OR t.date >= p_date_from)
        AND (p_date_to IS NULL OR t.date <= p_date_to)
        AND (p_types IS NULL OR t.type = ANY(p_types))
        AND (p_search IS NULL OR
             (t.description ILIKE '%' || p_search || '%' OR
              t.category ILIKE '%' || p_search || '%' OR
              t.recipient ILIKE '%' || p_search || '%'))
      ORDER BY
        CASE WHEN p_sort_field = 'date' AND p_sort_direction = 'asc' THEN t.date END ASC,
        CASE WHEN p_sort_field = 'date' AND p_sort_direction = 'desc' THEN t.date END DESC,
        CASE WHEN p_sort_field = 'amount' AND p_sort_direction = 'asc' THEN t.amount END ASC,
        CASE WHEN p_sort_field = 'amount' AND p_sort_direction = 'desc' THEN t.amount END DESC,
        CASE WHEN p_sort_field = 'type' AND p_sort_direction = 'asc' THEN t.type END ASC,
        CASE WHEN p_sort_field = 'type' AND p_sort_direction = 'desc' THEN t.type END DESC,
        CASE WHEN p_sort_field = 'description' AND p_sort_direction = 'asc' THEN t.description END ASC,
        CASE WHEN p_sort_field = 'description' AND p_sort_direction = 'desc' THEN t.description END DESC,
        CASE WHEN p_sort_field = 'category' AND p_sort_direction = 'asc' THEN t.category END ASC,
        CASE WHEN p_sort_field = 'category' AND p_sort_direction = 'desc' THEN t.category END DESC,
        CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'asc' THEN t.created_at END ASC,
        CASE WHEN p_sort_field = 'created_at' AND p_sort_direction = 'desc' THEN t.created_at END DESC,
        -- Add a stable tie-breaker to ensure consistent ordering
        t.id ASC
      LIMIT p_limit
      OFFSET p_offset
    ) as t_data;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[])
 RETURNS TABLE(transactions jsonb, total_count bigint)
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT *
  FROM get_user_transactions(
    p_user_id,
    p_offset,
    p_limit,
    p_date_from,
    p_date_to,
    p_types,
    p_search,
    p_sort_field,
    p_sort_direction,
    p_is_recurring,
    p_recurring_statuses,
    p_recurring_frequencies,
    NULL::TEXT[]
  );
END;
$function$;

ALTER FUNCTION public.get_user_transactions(
  uuid, integer, integer, date, date, text[], text, text, text
) SECURITY INVOKER;
ALTER FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[]
) SECURITY INVOKER;

REVOKE EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, date, date, text[], text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[]
) FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, date, date, text[], text, text, text
) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[]
) TO authenticated, service_role;
