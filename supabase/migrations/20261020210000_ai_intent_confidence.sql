-- Store the intent model's confidence on the intake item. The payload field is not part of the draft.

CREATE OR REPLACE FUNCTION public.create_ai_text_intake(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_result jsonb;
  v_confidence numeric;
BEGIN
  v_result := ai.create_text_intake(p_payload - 'intent_confidence');
  IF (p_payload->>'intent_confidence') ~ '^(0(\.[0-9]+)?|1(\.0+)?)$' THEN
    v_confidence := (p_payload->>'intent_confidence')::numeric;
    UPDATE ai.intake_items
    SET quality_signals = coalesce(quality_signals, '{}'::jsonb)
      || jsonb_build_object('intent_confidence', v_confidence)
    WHERE id = (v_result->>'item_id')::uuid
      AND user_id = auth.uid();
  END IF;
  RETURN v_result;
END;
$function$;
