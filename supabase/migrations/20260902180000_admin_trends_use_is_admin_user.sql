-- Use shared is_admin_user() for trends, matching get_admin_dashboard_stats.
-- Numeric behavior unchanged.

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

  IF NOT public.is_admin_user() THEN
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
        'active_users', active_users,
        'download_requests', download_requests,
        'by_currency', by_currency
      ) AS row_json
    FROM (
      SELECT
        gs.bucket,
        COALESCE(u.new_users, 0)::bigint AS new_users,
        COALESCE(t.total_income, 0)::numeric AS total_income,
        COALESCE(t.total_expenses, 0)::numeric AS total_expenses,
        COALESCE(t.total_donations, 0)::numeric AS total_donations,
        COALESCE(t.transaction_count, 0)::bigint AS transaction_count,
        COALESCE(t.active_users, 0)::bigint AS active_users,
        COALESCE(d.download_requests, 0)::bigint AS download_requests,
        COALESCE(c.by_currency, '{}'::json) AS by_currency
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
      LEFT JOIN (
        SELECT
          bucket,
          COALESCE(json_object_agg(
            currency,
            json_build_object(
              'income', income_sum,
              'expenses', expenses_sum,
              'donations', donations_sum
            )
          ), '{}'::json) AS by_currency
        FROM (
          SELECT
            date_trunc(trunc_unit, date)::date AS bucket,
            COALESCE(NULLIF(BTRIM(currency), ''), 'UNKNOWN') AS currency,
            COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0)::numeric AS income_sum,
            COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0)::numeric AS expenses_sum,
            COALESCE(SUM(amount) FILTER (WHERE type = 'donation'), 0)::numeric AS donations_sum
          FROM transactions
          WHERE date >= start_date_to_use
            AND date <= end_date_to_use
          GROUP BY 1, 2
        ) currency_stats
        GROUP BY bucket
      ) c ON c.bucket = gs.bucket
      LEFT JOIN (
        SELECT
          date_trunc(trunc_unit, created_at)::date AS bucket,
          COUNT(*)::bigint AS download_requests
        FROM public.download_requests
        WHERE status = 'sent'
          AND created_at::date >= start_date_to_use
          AND created_at::date <= end_date_to_use
        GROUP BY 1
      ) d ON d.bucket = gs.bucket
    ) joined
  ) buckets;

  RETURN result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_monthly_trends(date, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_monthly_trends(date, date)
  TO authenticated, service_role;
