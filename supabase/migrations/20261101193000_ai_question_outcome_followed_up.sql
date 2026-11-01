-- Allow a follow-up question to be recorded without counting as asked_again.

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
  IF p_outcome NOT IN ('asked_family', 'searched_description', 'asked_again', 'answered', 'followed_up') THEN
    RETURN;
  END IF;
  UPDATE ai.question_measurements
  SET quality_signals = quality_signals || jsonb_build_object('outcome', p_outcome)
  WHERE id = p_measurement_id
    AND user_id = auth.uid()
    AND NOT (quality_signals ? 'outcome');
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_ai_question_outcome(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_ai_question_outcome(uuid, text) TO authenticated;
