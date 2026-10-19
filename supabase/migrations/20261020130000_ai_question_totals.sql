-- Read-only totals and saved duplicate pairs for data questions.
-- get_analytics_range_stats adds every currency together and cannot
-- filter a payment method or a category.

CREATE OR REPLACE FUNCTION ai.question_totals(
  p_uid uuid,
  p_types text[],
  p_from date,
  p_to date,
  p_payment_method text,
  p_category text,
  p_description text
)
RETURNS TABLE (
  total numeric,
  row_count bigint,
  max_amount numeric,
  currencies text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT
    coalesce(sum(picked.amount), 0),
    count(*),
    coalesce(max(picked.amount), 0),
    coalesce(
      array_agg(DISTINCT picked.currency) FILTER (WHERE picked.currency <> ''),
      ARRAY[]::text[]
    )
  FROM (
    SELECT
      prior.amount,
      upper(coalesce(prior.currency, '')) AS currency
    FROM public.transactions AS prior
    WHERE p_uid IS NOT NULL
      AND prior.user_id = p_uid
      AND prior.type = ANY (p_types)
      AND prior.type IN (
        'income', 'expense', 'donation', 'exempt-income',
        'recognized-expense', 'non_tithe_donation'
      )
      AND prior.date BETWEEN p_from AND p_to
      AND (
        p_payment_method IS NULL
        OR prior.payment_method = p_payment_method
      )
      AND (
        p_category IS NULL
        OR lower(btrim(coalesce(prior.category, ''))) = lower(btrim(p_category))
      )
      AND (
        p_description IS NULL
        OR position(lower(p_description) IN lower(coalesce(prior.description, ''))) > 0
      )
  ) AS picked;
$$;

REVOKE ALL ON FUNCTION ai.question_totals(uuid, text[], date, date, text, text, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ai_question_totals(
  p_types text[],
  p_from date,
  p_to date,
  p_payment_method text,
  p_category text,
  p_description text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT jsonb_build_object(
    'total', found.total,
    'count', found.row_count,
    'max_amount', found.max_amount,
    'currencies', to_jsonb(found.currencies)
  )
  FROM ai.question_totals(
    auth.uid(),
    coalesce(p_types, ARRAY[]::text[]),
    p_from,
    p_to,
    nullif(btrim(p_payment_method), ''),
    nullif(btrim(p_category), ''),
    nullif(btrim(p_description), '')
  ) AS found;
$$;

REVOKE ALL ON FUNCTION public.ai_question_totals(text[], date, date, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_question_totals(text[], date, date, text, text, text)
  TO authenticated;

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
      AND b.amount BETWEEN a.amount * 0.98 AND a.amount * 1.02
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

REVOKE ALL ON FUNCTION public.list_ai_saved_duplicate_pairs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_ai_saved_duplicate_pairs() TO authenticated;
