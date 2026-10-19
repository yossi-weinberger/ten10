-- The listed amount is the one compared in the check currency.
-- A converted transaction returns its original amount when that is what matched.

CREATE OR REPLACE FUNCTION ai.matching_duplicate_candidates(
  p_uid uuid,
  p_type text,
  p_date date,
  p_amount numeric,
  p_currency text
)
RETURNS TABLE (
  id text,
  candidate_date text,
  amount numeric,
  description text,
  kind text,
  distance integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT
    picked.id,
    picked.candidate_date,
    picked.amount,
    picked.description,
    picked.kind,
    picked.distance
  FROM (
    SELECT
      prior.id::text AS id,
      prior.date::text AS candidate_date,
      CASE
        WHEN upper(coalesce(prior.currency, '')) = upper(coalesce(p_currency, ''))
          THEN prior.amount
        ELSE prior.original_amount
      END AS amount,
      left(coalesce(prior.description, ''), 80) AS description,
      'transaction'::text AS kind,
      abs(prior.date - p_date) AS distance
    FROM public.transactions AS prior
    WHERE prior.user_id = p_uid
      AND prior.type = p_type
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
    UNION ALL
    SELECT
      item.id::text,
      item.normalized_payload->>'date',
      CASE
        WHEN upper(coalesce(item.normalized_payload->>'currency', '')) = upper(coalesce(p_currency, ''))
          THEN (item.normalized_payload->>'amount')::numeric
        ELSE (item.normalized_payload->>'original_amount')::numeric
      END,
      left(coalesce(item.normalized_payload->>'description', ''), 80),
      'draft'::text,
      abs((item.normalized_payload->>'date')::date - p_date)
    FROM ai.intake_items AS item
    WHERE item.user_id = p_uid
      AND item.status IN ('ready', 'needs_review', 'approved')
      AND item.normalized_payload->>'type' = p_type
      AND (item.normalized_payload->>'date') ~ '^\d{4}-\d{2}-\d{2}$'
      AND (item.normalized_payload->>'date')::date BETWEEN p_date - 3 AND p_date + 3
      AND (
        (
          upper(coalesce(item.normalized_payload->>'currency', '')) = upper(coalesce(p_currency, ''))
          AND (item.normalized_payload->>'amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
          AND (item.normalized_payload->>'amount')::numeric BETWEEN p_amount * 0.98 AND p_amount * 1.02
        )
        OR (
          (item.normalized_payload->>'original_amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
          AND upper(coalesce(item.normalized_payload->>'original_currency', '')) = upper(coalesce(p_currency, ''))
          AND (item.normalized_payload->>'original_amount')::numeric = p_amount
        )
      )
  ) AS picked
  WHERE p_uid IS NOT NULL
    AND p_amount IS NOT NULL
    AND p_amount <> 0;
$$;

REVOKE ALL ON FUNCTION ai.matching_duplicate_candidates(uuid, text, date, numeric, text) FROM PUBLIC, anon, authenticated;
