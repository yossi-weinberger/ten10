-- Removes the multi-item intake RPC. Existing messages and items stay.

DROP FUNCTION IF EXISTS public.create_ai_text_intake_items(jsonb);
DROP FUNCTION IF EXISTS ai.create_text_intake_items(jsonb);
