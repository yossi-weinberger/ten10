-- Manual rollback for 20261019210000_ai_fix_save_and_access.sql.
-- Restores public.record_ai_shadow_type and public.record_ai_shadow_category.

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

  UPDATE ai.shadow_records
  SET model_type_choice = p_choice,
      model_type_confidence = v_confidence,
      updated_at = now()
  WHERE item_id = p_item_id
    AND user_id = v_uid;

  RETURN jsonb_build_object('recorded', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_ai_shadow_type(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ai_shadow_type(uuid, text, numeric) TO authenticated;

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

  UPDATE ai.shadow_records
  SET model_category_choice = btrim(p_choice),
      model_category_confidence = v_confidence,
      updated_at = now()
  WHERE item_id = p_item_id
    AND user_id = v_uid;

  RETURN jsonb_build_object('recorded', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.record_ai_shadow_category(uuid, text, numeric) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ai_shadow_category(uuid, text, numeric) TO authenticated;
