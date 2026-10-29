-- Removes the admin view of ai.model_calls.

DROP FUNCTION IF EXISTS public.get_admin_ai_calls(date, date);
