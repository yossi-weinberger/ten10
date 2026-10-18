-- Manual rollback for 20261019020000_ai_schema_foundation.sql.
-- Restores the previous 13-arg get_user_transactions. Does not drop
-- transactions.origin or schema ai. Run only when you mean to.

DROP FUNCTION IF EXISTS public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[], text[], text
);

CREATE FUNCTION public.get_user_transactions(
  p_user_id uuid,
  p_offset integer,
  p_limit integer,
  p_date_from text,
  p_date_to text,
  p_types text[],
  p_search text,
  p_sort_field text,
  p_sort_direction text,
  p_is_recurring boolean,
  p_recurring_statuses text[],
  p_recurring_frequencies text[],
  p_payment_methods text[]
)
RETURNS TABLE(transactions jsonb, total_count bigint)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  sort_field TEXT;
  sort_direction TEXT;
  sql TEXT;
BEGIN
  sort_field := CASE p_sort_field
    WHEN 'date' THEN 'date'
    WHEN 'amount' THEN 'amount'
    WHEN 'description' THEN 'description'
    WHEN 'currency' THEN 'currency'
    WHEN 'type' THEN 'type'
    WHEN 'category' THEN 'category'
    WHEN 'recipient' THEN 'recipient'
    WHEN 'payment_method' THEN 'payment_method'
    WHEN 'is_chomesh' THEN 'is_chomesh'
    WHEN 'created_at' THEN 'created_at'
    WHEN 'updated_at' THEN 'updated_at'
    ELSE 'created_at'
  END;

  sort_direction := CASE WHEN lower(p_sort_direction) = 'asc' THEN 'ASC' ELSE 'DESC' END;

  sql := format($f$
    WITH filtered AS (
      SELECT
        t.*,
        rt.status AS recurring_status,
        rt.frequency AS recurring_frequency,
        rt.execution_count AS recurring_execution_count,
        rt.total_occurrences AS recurring_total_occurrences,
        rt.day_of_month AS recurring_day_of_month_def,
        rt.start_date AS recurring_start_date,
        rt.next_due_date AS recurring_next_due_date
      FROM transactions t
      LEFT JOIN recurring_transactions rt ON t.source_recurring_id = rt.id
      WHERE t.user_id = $1
        AND ($2 IS NULL OR t.date >= NULLIF($2, '')::date)
        AND ($3 IS NULL OR t.date <= NULLIF($3, '')::date)
        AND ($4 IS NULL OR t.type = ANY($4))
        AND (
          $5 IS NULL OR $5 = '' OR
          t.description ILIKE '%%' || $5 || '%%' OR
          t.category ILIKE '%%' || $5 || '%%' OR
          t.recipient ILIKE '%%' || $5 || '%%' OR
          t.payment_method ILIKE '%%' || $5 || '%%'
        )
        AND ($9 IS NULL OR t.payment_method = ANY($9))
        AND (
          $6 IS NULL OR
          ($6 = true AND t.source_recurring_id IS NOT NULL) OR
          ($6 = false AND t.source_recurring_id IS NULL)
        )
        AND ($7 IS NULL OR rt.status = ANY($7))
        AND ($8 IS NULL OR rt.frequency = ANY($8))
    ),
    counted AS (
      SELECT COUNT(*)::BIGINT AS total_count FROM filtered
    ),
    paged AS (
      SELECT * FROM filtered
      ORDER BY %s %s
      OFFSET $10 LIMIT $11
    )
    SELECT
      COALESCE(
        jsonb_agg(
          (to_jsonb(p) -
            'recurring_status' -
            'recurring_frequency' -
            'recurring_execution_count' -
            'recurring_total_occurrences' -
            'recurring_day_of_month_def' -
            'recurring_start_date' -
            'recurring_next_due_date'
          ) ||
          jsonb_build_object(
            'recurring_info',
            CASE
              WHEN p.recurring_status IS NULL THEN NULL
              ELSE jsonb_build_object(
                'status', p.recurring_status,
                'frequency', p.recurring_frequency,
                'execution_count', p.recurring_execution_count,
                'total_occurrences', p.recurring_total_occurrences,
                'day_of_month', p.recurring_day_of_month_def,
                'start_date', p.recurring_start_date,
                'next_due_date', p.recurring_next_due_date
              )
            END
          )
        ),
        '[]'::jsonb
      ) AS transactions,
      (SELECT total_count FROM counted) AS total_count
    FROM paged p;
  $f$, sort_field, sort_direction);

  RETURN QUERY EXECUTE sql
    USING p_user_id, p_date_from, p_date_to, p_types, p_search, p_is_recurring, p_recurring_statuses, p_recurring_frequencies, p_payment_methods, p_offset, p_limit;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[], text[]
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[], text[]
) TO authenticated, service_role;
