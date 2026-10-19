-- Adds a recipient filter and a list of the user's saved recipients.
-- The previous totals function is replaced because Postgres cannot add an argument in place.

DROP FUNCTION IF EXISTS public.ai_question_totals(text[], date, date, text, text, text);
DROP FUNCTION IF EXISTS ai.question_totals(uuid, text[], date, date, text, text, text);

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
        OR lower(btrim(coalesce(prior.recipient, ''))) = lower(btrim(p_recipient))
      )
  ) AS picked;
$$;

REVOKE ALL ON FUNCTION ai.question_totals(uuid, text[], date, date, text, text, text, text)
  FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.ai_question_totals(
  p_types text[],
  p_from date,
  p_to date,
  p_payment_method text,
  p_category text,
  p_description text,
  p_recipient text
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
    nullif(btrim(p_description), ''),
    nullif(btrim(p_recipient), '')
  ) AS found;
$$;

REVOKE ALL ON FUNCTION public.ai_question_totals(text[], date, date, text, text, text, text)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_question_totals(text[], date, date, text, text, text, text)
  TO authenticated;

CREATE OR REPLACE FUNCTION public.list_ai_recipients()
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT coalesce(array_agg(DISTINCT btrim(recipient) ORDER BY btrim(recipient)), ARRAY[]::text[])
  FROM public.transactions
  WHERE user_id = auth.uid()
    AND recipient IS NOT NULL
    AND btrim(recipient) <> '';
$$;

REVOKE ALL ON FUNCTION public.list_ai_recipients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_ai_recipients() TO authenticated;
