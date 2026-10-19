-- The same recipient saved as חב"ד and חבד counts as one name.

CREATE OR REPLACE FUNCTION ai.question_totals(
  p_uid uuid,
  p_types text[],
  p_from date,
  p_to date,
  p_payment_method text,
  p_category text,
  p_description text,
  p_recipient text
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
      AND (p_payment_method IS NULL OR prior.payment_method = p_payment_method)
      AND (
        p_category IS NULL
        OR lower(btrim(coalesce(prior.category, ''))) = lower(btrim(p_category))
      )
      AND (
        p_description IS NULL
        OR position(lower(p_description) IN lower(coalesce(prior.description, ''))) > 0
      )
      AND (
        p_recipient IS NULL
        OR translate(lower(btrim(coalesce(prior.recipient, ''))), '״"''׳', '')
          = translate(lower(btrim(p_recipient)), '״"''׳', '')
      )
  ) AS picked;
$$;
