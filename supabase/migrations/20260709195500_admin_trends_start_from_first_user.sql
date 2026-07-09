-- "All time" admin trends should start from real product users, not backdated
-- transaction.date values (imports often use years like 2000–2024).
-- First auth.users signup in production: 2025-05.

CREATE OR REPLACE FUNCTION public.get_earliest_system_date()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_email TEXT;
  earliest_transaction DATE;
  earliest_user DATE;
  earliest_date DATE;
  min_sane_date CONSTANT DATE := DATE '2000-01-01';
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  SELECT email INTO current_user_email
  FROM auth.users
  WHERE id = auth.uid();

  IF NOT EXISTS (
    SELECT 1 FROM admin_emails
    WHERE email = current_user_email
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT MIN(created_at)::date INTO earliest_user
  FROM auth.users
  WHERE deleted_at IS NULL;

  -- Informational only: sane transaction.date (may predate signups due to imports)
  SELECT MIN(date) INTO earliest_transaction
  FROM transactions
  WHERE date >= min_sane_date
    AND date <= (CURRENT_DATE + INTERVAL '2 years')::date;

  -- All-time charts follow first real user, not imported historical tx dates
  earliest_date := COALESCE(earliest_user, CURRENT_DATE);

  IF earliest_date < min_sane_date THEN
    earliest_date := min_sane_date;
  END IF;

  RETURN json_build_object(
    'earliest_date', earliest_date,
    'earliest_transaction', earliest_transaction,
    'earliest_user', earliest_user
  );
END;
$function$;
