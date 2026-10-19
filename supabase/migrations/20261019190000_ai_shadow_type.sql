-- Store Jev's type choice beside the user's answer. The saved type does not change.

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
    'date', item.normalized_payload->>'date'
  )
  FROM ai.intake_items AS item
  WHERE item.id = p_item_id
    AND item.user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.record_ai_shadow_type(
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
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_choice NOT IN (
    'income', 'expense', 'donation', 'exempt-income',
    'recognized-expense', 'non_tithe_donation'
  ) THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;
  IF v_confidence IS NOT NULL AND (v_confidence < 0 OR v_confidence > 1) THEN
    v_confidence := NULL;
  END IF;

  UPDATE ai.intake_items
  SET quality_signals = coalesce(quality_signals, '{}'::jsonb) || jsonb_build_object(
    'shadow_type', jsonb_build_object(
      'choice', p_choice,
      'confidence', v_confidence,
      'matched_user_type', (normalized_payload->>'type') IS NOT DISTINCT FROM p_choice
    )
  )
  WHERE id = p_item_id
    AND user_id = v_uid;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;
  RETURN jsonb_build_object('recorded', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.read_ai_shadow_type_context(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_ai_shadow_type(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.read_ai_shadow_type_context(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_shadow_type(uuid, text, numeric) TO authenticated;

DO $check$
BEGIN
  IF has_function_privilege('anon', 'public.record_ai_shadow_type(uuid, text, numeric)', 'execute') THEN
    RAISE EXCEPTION 'anon must not record a shadow type';
  END IF;
END;
$check$;
