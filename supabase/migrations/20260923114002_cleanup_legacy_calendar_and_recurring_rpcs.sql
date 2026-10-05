DROP FUNCTION IF EXISTS public.calculate_new_next_due_date(date, integer);
DROP FUNCTION IF EXISTS public.execute_due_recurring_transactions();

UPDATE public.profiles
SET client_preferences = client_preferences - 'maaserYearStart'
WHERE client_preferences ? 'maaserYearStart';
