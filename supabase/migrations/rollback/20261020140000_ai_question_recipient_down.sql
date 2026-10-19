-- Removes the recipient argument and the recipient list.
-- Re-apply 20261020130000_ai_question_totals.sql afterwards to restore the previous totals function.

DROP FUNCTION IF EXISTS public.list_ai_recipients();
DROP FUNCTION IF EXISTS public.ai_question_totals(text[], date, date, text, text, text, text);
DROP FUNCTION IF EXISTS ai.question_totals(uuid, text[], date, date, text, text, text, text);
