-- The saved-pair window uses the same ordered 2% bounds as matching_duplicate_candidates.

CREATE OR REPLACE FUNCTION public.list_ai_saved_duplicate_pairs()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  WITH pairs AS (
    SELECT
      a.id::text AS left_id,
      a.date::text AS left_date,
      a.amount AS left_amount,
      coalesce(a.currency, '') AS left_currency,
      left(coalesce(a.description, ''), 80) AS left_description,
      b.id::text AS right_id,
      b.date::text AS right_date,
      b.amount AS right_amount,
      coalesce(b.currency, '') AS right_currency,
      left(coalesce(b.description, ''), 80) AS right_description,
      greatest(a.date, b.date) AS later_date
    FROM public.transactions AS a
    JOIN public.transactions AS b
      ON b.user_id = a.user_id
     AND b.id > a.id
     AND b.type = a.type
     AND upper(coalesce(b.currency, '')) = upper(coalesce(a.currency, ''))
     AND b.date BETWEEN a.date - 3 AND a.date + 3
    WHERE a.user_id = auth.uid()
      AND a.amount IS NOT NULL
      AND a.amount <> 0
      AND b.amount BETWEEN least(a.amount * 0.98, a.amount * 1.02)
        AND greatest(a.amount * 0.98, a.amount * 1.02)
      AND NOT EXISTS (
        SELECT 1
        FROM ai.duplicate_dismissals AS dismissed
        WHERE dismissed.user_id = a.user_id
          AND dismissed.transaction_a = a.id
          AND dismissed.transaction_b = b.id
      )
  )
  SELECT jsonb_build_object(
    'count', (SELECT count(*) FROM pairs),
    'pairs', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'left', jsonb_build_object(
            'id', row.left_id,
            'date', row.left_date,
            'amount', row.left_amount,
            'currency', row.left_currency,
            'type', '',
            'description', row.left_description
          ),
          'right', jsonb_build_object(
            'id', row.right_id,
            'date', row.right_date,
            'amount', row.right_amount,
            'currency', row.right_currency,
            'type', '',
            'description', row.right_description
          )
        )
        ORDER BY row.later_date DESC, row.left_id, row.right_id
      )
      FROM (
        SELECT *
        FROM pairs
        ORDER BY later_date DESC, left_id, right_id
        LIMIT 5
      ) AS row
    ), '[]'::jsonb)
  );
$$;
