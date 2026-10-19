-- Drops the dismiss action. Re-apply 20261020130000_ai_question_totals.sql
-- to restore the pair list without the dismissal filter.

DROP FUNCTION IF EXISTS public.dismiss_ai_duplicate_pair(uuid, uuid);
