-- Slot confidence is written by the Edge function, not by the signed-in user.
-- The user may only mark what they did after the answer.

DROP FUNCTION IF EXISTS public.record_ai_slot_confidence(jsonb);
DROP FUNCTION IF EXISTS ai.record_question_slot_confidence(uuid, jsonb);

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
  IF p_user_id NOT IN (
    '01665dce-d261-4a9b-b89d-04ce2460859b'::uuid,
    '45e3efc0-171b-48ce-9f15-4468394dfaeb'::uuid,
    'a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4'::uuid,
    '5403d7d1-3f44-4243-a84a-f905c4aad30c'::uuid,
    'f336e5d1-4dc2-40c6-b176-c0b199ee836d'::uuid,
    'a3f81dec-f634-4784-9cc0-9921838a6037'::uuid,
    'c4e7d297-9ed3-421a-af9c-92ccccf95ba0'::uuid
  ) THEN
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

CREATE OR REPLACE FUNCTION public.mark_ai_question_outcome(
  p_measurement_id uuid,
  p_outcome text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  IF p_outcome NOT IN ('asked_family', 'searched_description', 'asked_again', 'answered') THEN
    RETURN;
  END IF;
  UPDATE ai.question_measurements
  SET quality_signals = quality_signals || jsonb_build_object('outcome', p_outcome)
  WHERE id = p_measurement_id
    AND user_id = auth.uid()
    AND NOT (quality_signals ? 'outcome');
END;
$function$;

REVOKE ALL ON FUNCTION ai.record_question_slot_confidence(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ai_slot_confidence(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_ai_question_outcome(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ai_slot_confidence(uuid, jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_ai_question_outcome(uuid, text) TO authenticated;

DO $check$
BEGIN
  IF has_function_privilege('anon', 'public.record_ai_slot_confidence(uuid, jsonb)', 'execute')
     OR has_function_privilege('authenticated', 'public.record_ai_slot_confidence(uuid, jsonb)', 'execute') THEN
    RAISE EXCEPTION 'only service_role may record slot confidence';
  END IF;
END;
$check$;
