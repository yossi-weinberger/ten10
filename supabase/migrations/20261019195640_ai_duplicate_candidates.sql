-- Stage-2 duplicate filter only. A warning, not a block, and no model call.
-- Same user, same type, date within 3 days, amount within 2%
-- or the same original amount and currency.

CREATE OR REPLACE FUNCTION public.list_ai_duplicate_candidates(
  p_type text,
  p_date date,
  p_amount numeric,
  p_currency text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(found)), '[]'::jsonb)
  FROM (
    SELECT
      prior.date::text AS date,
      prior.amount,
      left(coalesce(prior.description, ''), 80) AS description
    FROM public.transactions AS prior
    WHERE prior.user_id = auth.uid()
      AND prior.type = p_type
      AND p_amount IS NOT NULL
      AND p_amount <> 0
      AND prior.date BETWEEN p_date - 3 AND p_date + 3
      AND (
        (
          upper(coalesce(prior.currency, '')) = upper(coalesce(p_currency, ''))
          AND prior.amount BETWEEN p_amount * 0.98 AND p_amount * 1.02
        )
        OR (
          prior.original_amount IS NOT NULL
          AND upper(coalesce(prior.original_currency, '')) = upper(coalesce(p_currency, ''))
          AND prior.original_amount = p_amount
        )
      )
    ORDER BY abs(prior.date - p_date), prior.date DESC
    LIMIT 20
  ) AS found;
$$;

REVOKE ALL ON FUNCTION public.list_ai_duplicate_candidates(text, date, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_ai_duplicate_candidates(text, date, numeric, text) TO authenticated;

DO $check$
BEGIN
  IF has_function_privilege('anon', 'public.list_ai_duplicate_candidates(text, date, numeric, text)', 'execute') THEN
    RAISE EXCEPTION 'anon must not list duplicate candidates';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.list_ai_duplicate_candidates(text, date, numeric, text)', 'execute') THEN
    RAISE EXCEPTION 'authenticated must list duplicate candidates';
  END IF;
END;
$check$;
