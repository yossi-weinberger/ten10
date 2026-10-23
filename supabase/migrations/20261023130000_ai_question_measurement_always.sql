-- A data question always inserts one measurement row. Slot scores are optional.
-- The question text is not stored.

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
  v_number numeric;
  v_slots jsonb := '{}'::jsonb;
  v_id uuid;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF NOT ai.is_trial_user(p_user_id) THEN
    RETURN NULL;
  END IF;

  IF p_signals IS NOT NULL AND jsonb_typeof(p_signals) = 'object' THEN
    FOREACH v_field IN ARRAY ARRAY['family', 'measure', 'recipient', 'category', 'payment_method']
    LOOP
      IF jsonb_typeof(p_signals->v_field) = 'number' THEN
        v_number := (p_signals->>v_field)::numeric;
        IF v_number >= 0 AND v_number <= 1 THEN
          v_slots := v_slots || jsonb_build_object(v_field, v_number);
        END IF;
      END IF;
    END LOOP;
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
