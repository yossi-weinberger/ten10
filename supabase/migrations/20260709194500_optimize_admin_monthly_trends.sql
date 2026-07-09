-- Optimize admin trends RPC:
-- 1) Replace per-month correlated subqueries with set-based aggregates (fixes statement timeout).
-- 2) Clamp absurd transaction dates (e.g. year 0002) so "all time" does not generate ~24k months.
-- 3) Use daily buckets for short ranges (<= 62 days) so "this month" is a real series, not one point.

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

  -- Ignore garbage historical dates that blow up generate_series / all-time charts
  SELECT MIN(date) INTO earliest_transaction
  FROM transactions
  WHERE date >= min_sane_date
    AND date <= (CURRENT_DATE + INTERVAL '2 years')::date;

  SELECT MIN(created_at)::date INTO earliest_user
  FROM auth.users
  WHERE deleted_at IS NULL;

  earliest_date := LEAST(
    COALESCE(earliest_transaction, CURRENT_DATE),
    COALESCE(earliest_user, CURRENT_DATE)
  );

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

CREATE OR REPLACE FUNCTION public.get_admin_monthly_trends(
  p_start_date date DEFAULT NULL::date,
  p_end_date date DEFAULT NULL::date
)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_email TEXT;
  result JSON;
  start_date_to_use DATE;
  end_date_to_use DATE;
  min_sane_date CONSTANT DATE := DATE '2000-01-01';
  max_sane_date DATE;
  use_daily BOOLEAN;
  trunc_unit TEXT;
  label_fmt TEXT;
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

  max_sane_date := (CURRENT_DATE + INTERVAL '2 years')::date;
  end_date_to_use := COALESCE(p_end_date, CURRENT_DATE);
  start_date_to_use := COALESCE(p_start_date, (end_date_to_use - INTERVAL '12 months')::date);

  IF start_date_to_use < min_sane_date THEN
    start_date_to_use := min_sane_date;
  END IF;
  IF end_date_to_use > max_sane_date THEN
    end_date_to_use := max_sane_date;
  END IF;
  IF start_date_to_use > end_date_to_use THEN
    start_date_to_use := end_date_to_use;
  END IF;

  -- Short ranges: daily points (fixes "this month" single-dot charts)
  use_daily := (end_date_to_use - start_date_to_use) <= 62;
  trunc_unit := CASE WHEN use_daily THEN 'day' ELSE 'month' END;
  label_fmt := CASE WHEN use_daily THEN 'YYYY-MM-DD' ELSE 'YYYY-MM' END;

  SELECT COALESCE(json_agg(row_json ORDER BY period_label), '[]'::json)
  INTO result
  FROM (
    SELECT
      TO_CHAR(bucket, label_fmt) AS period_label,
      json_build_object(
        'month', TO_CHAR(bucket, label_fmt),
        'new_users', new_users,
        'total_income', total_income,
        'total_expenses', total_expenses,
        'total_donations', total_donations,
        'transaction_count', transaction_count,
        'active_users', active_users
      ) AS row_json
    FROM (
      SELECT
        gs.bucket,
        COALESCE(u.new_users, 0)::bigint AS new_users,
        COALESCE(t.total_income, 0)::numeric AS total_income,
        COALESCE(t.total_expenses, 0)::numeric AS total_expenses,
        COALESCE(t.total_donations, 0)::numeric AS total_donations,
        COALESCE(t.transaction_count, 0)::bigint AS transaction_count,
        COALESCE(t.active_users, 0)::bigint AS active_users
      FROM (
        SELECT generate_series(
          date_trunc(trunc_unit, start_date_to_use::timestamp),
          date_trunc(trunc_unit, end_date_to_use::timestamp),
          ('1 ' || trunc_unit)::interval
        )::date AS bucket
      ) gs
      LEFT JOIN (
        SELECT
          date_trunc(trunc_unit, created_at)::date AS bucket,
          COUNT(*)::bigint AS new_users
        FROM auth.users
        WHERE deleted_at IS NULL
          AND created_at::date >= start_date_to_use
          AND created_at::date <= end_date_to_use
        GROUP BY 1
      ) u ON u.bucket = gs.bucket
      LEFT JOIN (
        SELECT
          date_trunc(trunc_unit, date)::date AS bucket,
          COUNT(*)::bigint AS transaction_count,
          COUNT(DISTINCT user_id)::bigint AS active_users,
          COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::numeric AS total_income,
          COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::numeric AS total_expenses,
          COALESCE(SUM(amount) FILTER (WHERE type = 'donation'), 0)::numeric AS total_donations
        FROM transactions
        WHERE date >= start_date_to_use
          AND date <= end_date_to_use
        GROUP BY 1
      ) t ON t.bucket = gs.bucket
    ) joined
    -- Keep empty days for short daily ranges (continuous month chart).
    -- Drop empty months for longer monthly ranges.
    WHERE use_daily
      OR new_users > 0
      OR total_income > 0
      OR total_expenses > 0
      OR total_donations > 0
      OR transaction_count > 0
  ) filtered;

  RETURN result;
END;
$function$;
