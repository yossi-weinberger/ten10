-- Removes question slot confidence storage.

DROP FUNCTION IF EXISTS public.record_ai_slot_confidence(jsonb);
DROP FUNCTION IF EXISTS ai.record_question_slot_confidence(uuid, jsonb);
DROP TABLE IF EXISTS ai.question_measurements;
