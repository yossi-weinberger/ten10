-- Rollback for 20261102180000_ai_security_and_scaling.sql

DROP INDEX IF EXISTS ai.usage_events_user_id_idx;

ALTER TABLE ai.model_calls DROP CONSTRAINT IF EXISTS model_calls_operation_check;
ALTER TABLE ai.model_calls ADD CONSTRAINT model_calls_operation_check CHECK (operation IN (
  'intent', 'question_slots', 'receipt', 'speech', 'duplicates', 'shadow', 'split'
));

CREATE OR REPLACE FUNCTION ai.is_trial_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT p_user_id IN (
    '01665dce-d261-4a9b-b89d-04ce2460859b'::uuid,
    '45e3efc0-171b-48ce-9f15-4468394dfaeb'::uuid,
    'a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4'::uuid,
    '5403d7d1-3f44-4243-a84a-f905c4aad30c'::uuid,
    'f336e5d1-4dc2-40c6-b176-c0b199ee836d'::uuid,
    'a3f81dec-f634-4784-9cc0-9921838a6037'::uuid,
    'c4e7d297-9ed3-421a-af9c-92ccccf95ba0'::uuid
  );
$$;

REVOKE ALL ON FUNCTION ai.is_trial_user(uuid) FROM PUBLIC, anon, authenticated;
