-- Restores the slot-confidence function that skipped a row when no score matched.

CREATE OR REPLACE FUNCTION ai.record_question_slot_confidence(
  p_user_id uuid,
  p_signals jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_field text;
  v_slots jsonb := '{}'::jsonb;
  v_id uuid;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF NOT ai.is_trial_user(p_user_id) THEN
    RETURN NULL;
  END IF;
  IF p_signals IS NULL OR jsonb_typeof(p_signals) IS DISTINCT FROM 'object' THEN
    RETURN NULL;
  END IF;

  FOREACH v_field IN ARRAY ARRAY['family', 'measure', 'recipient', 'category', 'payment_method']
  LOOP
    IF (p_signals->>v_field) ~ '^(0(\.[0-9]+)?|1(\.0+)?)$' THEN
      v_slots := v_slots || jsonb_build_object(v_field, (p_signals->>v_field)::numeric);
    END IF;
  END LOOP;

  IF v_slots = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  INSERT INTO ai.question_measurements (user_id, quality_signals)
  VALUES (p_user_id, jsonb_build_object('slot_confidence', v_slots))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_ai_slot_confidence(
  p_user_id uuid,
  p_signals jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN ai.record_question_slot_confidence(p_user_id, p_signals);
END;
$function$;

REVOKE ALL ON FUNCTION ai.record_question_slot_confidence(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ai_slot_confidence(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_slot_confidence(uuid, jsonb) TO service_role;
