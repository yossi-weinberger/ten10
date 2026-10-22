-- Store per-field slot confidence for a trial user's data question.
-- The question text is not stored.

CREATE TABLE ai.question_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  quality_signals jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai.question_measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY question_measurements_select ON ai.question_measurements
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON ai.question_measurements TO authenticated;
GRANT ALL ON ai.question_measurements TO service_role;

CREATE OR REPLACE FUNCTION ai.record_question_slot_confidence(
  p_user_id uuid,
  p_signals jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_field text;
  v_slots jsonb := '{}'::jsonb;
BEGIN
  IF p_user_id IS NULL OR p_user_id NOT IN (
    '01665dce-d261-4a9b-b89d-04ce2460859b'::uuid,
    '45e3efc0-171b-48ce-9f15-4468394dfaeb'::uuid,
    'a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4'::uuid,
    '5403d7d1-3f44-4243-a84a-f905c4aad30c'::uuid,
    'f336e5d1-4dc2-40c6-b176-c0b199ee836d'::uuid,
    'a3f81dec-f634-4784-9cc0-9921838a6037'::uuid,
    'c4e7d297-9ed3-421a-af9c-92ccccf95ba0'::uuid
  ) THEN
    RETURN;
  END IF;

  IF p_signals IS NULL OR jsonb_typeof(p_signals) IS DISTINCT FROM 'object' THEN
    RETURN;
  END IF;

  FOREACH v_field IN ARRAY ARRAY['family', 'measure', 'recipient', 'category', 'payment_method']
  LOOP
    IF (p_signals->>v_field) ~ '^(0(\.[0-9]+)?|1(\.0+)?)$' THEN
      v_slots := v_slots || jsonb_build_object(v_field, (p_signals->>v_field)::numeric);
    END IF;
  END LOOP;

  IF v_slots = '{}'::jsonb THEN
    RETURN;
  END IF;

  INSERT INTO ai.question_measurements (user_id, quality_signals)
  VALUES (p_user_id, jsonb_build_object('slot_confidence', v_slots));
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_ai_slot_confidence(p_signals jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  PERFORM ai.record_question_slot_confidence(auth.uid(), p_signals);
END;
$function$;

REVOKE ALL ON FUNCTION ai.record_question_slot_confidence(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ai_slot_confidence(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_ai_slot_confidence(jsonb) TO authenticated;
