-- Wave 4: Security, DB performance, scaling and allowlist flexibility.
-- 1. Extend ai.model_calls operation CHECK constraint to include 'question_period'.
-- 2. Add index on ai.usage_events (user_id) for scale performance under load.
-- 3. Update ai.is_trial_user to allow global enablement when app.ai_trial_only = 'false'.
-- 4. Reaffirm and complete explicit REVOKE / GRANT on all public and ai functions.

-- 1. Operation constraint
ALTER TABLE ai.model_calls DROP CONSTRAINT IF EXISTS model_calls_operation_check;
ALTER TABLE ai.model_calls ADD CONSTRAINT model_calls_operation_check CHECK (operation IN (
  'intent', 'question_slots', 'question_period', 'receipt', 'speech', 'duplicates', 'shadow', 'split'
));

-- 2. Performance index on usage events
CREATE INDEX IF NOT EXISTS usage_events_user_id_idx ON ai.usage_events (user_id);

-- 3. Production allowlist control for trial user check
CREATE OR REPLACE FUNCTION ai.is_trial_user(p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
DECLARE
  v_trial_only text;
BEGIN
  IF p_user_id IS NULL THEN
    RETURN false;
  END IF;

  BEGIN
    v_trial_only := current_setting('app.ai_trial_only', true);
  EXCEPTION WHEN OTHERS THEN
    v_trial_only := NULL;
  END;

  IF v_trial_only = 'false' THEN
    RETURN true;
  END IF;

  RETURN p_user_id IN (
    '01665dce-d261-4a9b-b89d-04ce2460859b'::uuid,
    '45e3efc0-171b-48ce-9f15-4468394dfaeb'::uuid,
    'a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4'::uuid,
    '5403d7d1-3f44-4243-a84a-f905c4aad30c'::uuid,
    'f336e5d1-4dc2-40c6-b176-c0b199ee836d'::uuid,
    'a3f81dec-f634-4784-9cc0-9921838a6037'::uuid,
    'c4e7d297-9ed3-421a-af9c-92ccccf95ba0'::uuid
  );
END;
$$;

REVOKE ALL ON FUNCTION ai.is_trial_user(uuid) FROM PUBLIC, anon, authenticated;

-- 4. Explicit REVOKE and GRANT on public RPC functions
REVOKE ALL ON FUNCTION public.list_ai_duplicate_candidates(text, date, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_ai_duplicate_candidates(text, date, numeric, text) TO authenticated;

REVOKE ALL ON FUNCTION public.list_ai_saved_duplicate_pairs() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_ai_saved_duplicate_pairs() TO authenticated;

REVOKE ALL ON FUNCTION public.list_ai_recipients() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_ai_recipients() TO authenticated;

REVOKE ALL ON FUNCTION public.reject_uncommitted_ai_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_uncommitted_ai_item(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.dismiss_ai_duplicate_pair(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dismiss_ai_duplicate_pair(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.undo_ai_transaction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_ai_transaction(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.undo_ai_intake_commit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_ai_intake_commit(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.create_ai_text_intake(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_ai_text_intake(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.create_ai_text_intake_items(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_ai_text_intake_items(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.commit_ai_intake_items(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.commit_ai_intake_items(jsonb) TO authenticated;

REVOKE ALL ON FUNCTION public.approve_ai_user_rule(text, text, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_ai_user_rule(text, text, date) TO authenticated;

REVOKE ALL ON FUNCTION public.disable_ai_user_rule(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.disable_ai_user_rule(text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.list_ai_user_rules() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_ai_user_rules() TO authenticated;

REVOKE ALL ON FUNCTION public.attach_ai_receipt_artifact(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.attach_ai_receipt_artifact(uuid, uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.ai_question_totals(text[], date, date, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ai_question_totals(text[], date, date, text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.list_ai_reader_rules(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_ai_reader_rules(uuid) TO service_role;
