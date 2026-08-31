-- Admin finance + trends: per-currency breakdown for filters, related types
-- in stats by_currency (one scan), installer download-request series.
-- Admin-only RPCs. Client calls get_admin_dashboard_stats() with no args;
-- the integer overload stays as a thin wrapper.

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_user_email TEXT;
  result JSON;
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

  SELECT json_build_object(
    'users', json_build_object(
      'total', (
        SELECT COUNT(*)
        FROM auth.users
        WHERE deleted_at IS NULL
      ),
      'active_30d', (
        SELECT COUNT(DISTINCT user_id)
        FROM transactions
        WHERE created_at > NOW() - INTERVAL '30 days'
      ),
      'new_30d', (
        SELECT COUNT(*)
        FROM auth.users
        WHERE created_at > NOW() - INTERVAL '30 days'
          AND deleted_at IS NULL
      ),
      'new_7d', (
        SELECT COUNT(*)
        FROM auth.users
        WHERE created_at > NOW() - INTERVAL '7 days'
          AND deleted_at IS NULL
      )
    ),
    'finance', (
      SELECT json_build_object(
        'total_income', COALESCE(SUM(income_sum), 0),
        'total_expenses', COALESCE(SUM(expenses_sum), 0),
        'total_donations', COALESCE(SUM(donations_sum), 0),
        'total_recognized_expenses', COALESCE(SUM(recognized_expenses_sum), 0),
        'total_exempt_income', COALESCE(SUM(exempt_income_sum), 0),
        'total_non_tithe_donation', COALESCE(SUM(non_tithe_donation_sum), 0),
        'by_currency', COALESCE(json_object_agg(
          currency,
          json_build_object(
            'income', income_sum,
            'expenses', expenses_sum,
            'donations', donations_sum,
            'exempt_income', exempt_income_sum,
            'recognized_expenses', recognized_expenses_sum,
            'non_tithe_donation', non_tithe_donation_sum,
            'total_managed', income_sum + expenses_sum + donations_sum
          )
        ), '{}'::json)
      )
      FROM (
        SELECT
          COALESCE(NULLIF(BTRIM(currency), ''), 'UNKNOWN') AS currency,
          COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income_sum,
          COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expenses_sum,
          COALESCE(SUM(amount) FILTER (WHERE type = 'donation'), 0) AS donations_sum,
          COALESCE(SUM(amount) FILTER (WHERE type = 'exempt-income'), 0) AS exempt_income_sum,
          COALESCE(SUM(amount) FILTER (WHERE type = 'recognized-expense'), 0) AS recognized_expenses_sum,
          COALESCE(SUM(amount) FILTER (WHERE type = 'non_tithe_donation'), 0) AS non_tithe_donation_sum
        FROM transactions
        GROUP BY 1
      ) currency_stats
    ),
    'downloads', json_build_object(
      'total', (
        SELECT COUNT(*)
        FROM public.download_requests
        WHERE status = 'sent'
      ),
      'last_7d', (
        SELECT COUNT(*)
        FROM public.download_requests
        WHERE status = 'sent'
          AND created_at > NOW() - INTERVAL '7 days'
      ),
      'last_30d', (
        SELECT COUNT(*)
        FROM public.download_requests
        WHERE status = 'sent'
          AND created_at > NOW() - INTERVAL '30 days'
      ),
      'by_platform', json_build_object(
        'windows', (
          SELECT COUNT(*)
          FROM public.download_requests
          WHERE status = 'sent'
        )
      )
    ),
    'engagement', json_build_object(
      'avg_transactions_per_user', COALESCE((
        SELECT AVG(transaction_count)
        FROM (
          SELECT user_id, COUNT(*) as transaction_count
          FROM transactions
          GROUP BY user_id
        ) user_transactions
      ), 0),
      'total_transactions', (
        SELECT COUNT(*) FROM transactions
      ),
      'users_with_transactions', (
        SELECT COUNT(DISTINCT user_id) FROM transactions
      )
    ),
    'system', json_build_object(
      'total_recurring_transactions', (
        SELECT COUNT(*) FROM recurring_transactions
      ),
      'active_recurring_transactions', (
        SELECT COUNT(*) FROM recurring_transactions WHERE status = 'active'
      )
    )
  ) INTO result;

  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(p_days_back integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  RETURN public.get_admin_dashboard_stats();
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

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats()
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(integer)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_monthly_trends(date, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_monthly_trends(date, date)
  TO authenticated, service_role;
