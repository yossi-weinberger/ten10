-- Add the saved type and category to the shadow context, and store a category choice.
-- The saved category does not change.

CREATE OR REPLACE FUNCTION public.read_ai_shadow_type_context(p_item_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT jsonb_build_object(
    'description', left(coalesce(item.normalized_payload->>'description', ''), 200),
    'amount', CASE
      WHEN (item.normalized_payload->>'original_amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
        THEN (item.normalized_payload->>'original_amount')::numeric
      ELSE (item.normalized_payload->>'amount')::numeric
    END,
    'currency', coalesce(
      nullif(upper(btrim(item.normalized_payload->>'original_currency')), ''),
      upper(btrim(item.normalized_payload->>'currency'))
    ),
    'date', item.normalized_payload->>'date',
    'type', item.normalized_payload->>'type',
    'category', nullif(btrim(item.normalized_payload->>'category'), '')
  )
  FROM ai.intake_items AS item
  WHERE item.id = p_item_id
    AND item.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.record_ai_shadow_category(
  p_item_id uuid,
  p_choice text,
  p_confidence numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_confidence numeric := p_confidence;
  v_base text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_choice IS NULL OR char_length(btrim(p_choice)) = 0 OR char_length(p_choice) > 80 THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;
  IF v_confidence IS NOT NULL AND (v_confidence < 0 OR v_confidence > 1) THEN
    v_confidence := NULL;
  END IF;

  SELECT CASE item.normalized_payload->>'type'
    WHEN 'expense' THEN 'expense'
    WHEN 'recognized-expense' THEN 'expense'
    WHEN 'income' THEN 'income'
    WHEN 'exempt-income' THEN 'income'
    ELSE NULL
  END
  INTO v_base
  FROM ai.intake_items AS item
  WHERE item.id = p_item_id
    AND item.user_id = v_uid;

  IF v_base IS NULL THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;

  IF NOT (
    (v_base = 'expense' AND p_choice IN (
      'food', 'transportation', 'housing', 'utilities', 'healthcare',
      'education', 'leisure', 'shopping', 'other'
    ))
    OR (v_base = 'income' AND p_choice IN (
      'salary', 'business', 'freelance', 'investment', 'allowance', 'gift', 'other'
    ))
    OR EXISTS (
      SELECT 1
      FROM public.transactions AS prior
      WHERE prior.user_id = v_uid
        AND prior.type = v_base
        AND prior.category = p_choice
    )
  ) THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;

  UPDATE ai.intake_items
  SET quality_signals = coalesce(quality_signals, '{}'::jsonb) || jsonb_build_object(
    'shadow_category', jsonb_build_object(
      'choice', p_choice,
      'confidence', v_confidence,
      'matched_saved_category', (normalized_payload->>'category') IS NOT DISTINCT FROM p_choice
    )
  )
  WHERE id = p_item_id
    AND user_id = v_uid;

  RETURN jsonb_build_object('recorded', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_ai_shadow_category(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ai_shadow_category(uuid, text, numeric) TO authenticated;

DO $check$
BEGIN
  IF has_function_privilege('anon', 'public.record_ai_shadow_category(uuid, text, numeric)', 'execute') THEN
    RAISE EXCEPTION 'anon must not record a shadow category';
  END IF;
END;
$check$;
