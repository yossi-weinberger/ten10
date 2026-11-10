-- Rollback: recreate shadow RPCs exactly as in 20261103100000_ai_intake.sql

CREATE FUNCTION public.read_ai_shadow_type_context(p_item_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $_$
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
$_$;

CREATE FUNCTION public.record_ai_shadow_category(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_confidence numeric := p_confidence;
  v_base text;
  v_saved text;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
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
  END,
  nullif(btrim(item.normalized_payload->>'category'), '')
  INTO v_base, v_saved
  FROM ai.intake_items AS item
  WHERE item.id = p_item_id
    AND item.user_id = p_user_id;

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
      WHERE prior.user_id = p_user_id
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
      'matched_saved_category', CASE
        WHEN v_saved IS NULL THEN NULL
        ELSE v_saved IS NOT DISTINCT FROM p_choice
      END
    )
  )
  WHERE id = p_item_id
    AND user_id = p_user_id;

  RETURN jsonb_build_object('recorded', true);
END;
$$;

CREATE FUNCTION public.record_ai_shadow_type(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_confidence numeric := p_confidence;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
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
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;
  RETURN jsonb_build_object('recorded', true);
END;
$$;

-- Restore grants
REVOKE ALL ON FUNCTION public.read_ai_shadow_type_context(p_item_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.read_ai_shadow_type_context(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.read_ai_shadow_type_context(p_item_id uuid) TO service_role;

REVOKE ALL ON FUNCTION public.record_ai_shadow_category(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.record_ai_shadow_category(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) TO service_role;

REVOKE ALL ON FUNCTION public.record_ai_shadow_type(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.record_ai_shadow_type(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) TO service_role;
