-- Rollback for 20261110120000_admin_ai_user_plans.sql
-- Drops the admin functions for managing AI user plans.
-- After running: supabase migration repair --status reverted 20261110120000

DROP FUNCTION IF EXISTS public.admin_list_user_plans();
DROP FUNCTION IF EXISTS public.admin_set_user_plan(text, text, date, text, boolean);
DROP FUNCTION IF EXISTS public.admin_remove_user_plan(text, boolean);
