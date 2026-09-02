-- Collapse remaining transactions scans in get_admin_dashboard_stats
-- into one materialized scan (finance + engagement + active_30d).
-- Users/downloads definitions unchanged. Integer overload wraps no-arg.
-- Admin-only: SECURITY DEFINER + is_admin_user().

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  result JSON;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;

  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  SELECT json_build_object(
    'users', json_build_object(
      'total', (
        SELECT COUNT(*)
        FROM auth.users
        WHERE deleted_at IS NULL
      ),
      'active_30d', scanned.active_30d,
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
    'finance', scanned.finance,
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
      'avg_transactions_per_user', CASE
        WHEN scanned.users_with_transactions > 0
        THEN scanned.total_transactions::numeric / scanned.users_with_transactions
        ELSE 0
      END,
      'total_transactions', scanned.total_transactions,
      'users_with_transactions', scanned.users_with_transactions
    ),
    'system', json_build_object(
      'total_recurring_transactions', (
        SELECT COUNT(*) FROM recurring_transactions
      ),
      'active_recurring_transactions', (
        SELECT COUNT(*) FROM recurring_transactions WHERE status = 'active'
      )
    )
  )
  INTO result
  FROM (
    WITH tx AS MATERIALIZED (
      SELECT
        user_id,
        type,
        amount,
        created_at,
        COALESCE(NULLIF(BTRIM(currency), ''), 'UNKNOWN') AS currency
      FROM transactions
    ),
    currency_stats AS (
      SELECT
        currency,
        COALESCE(SUM(amount) FILTER (WHERE type = 'income'), 0) AS income_sum,
        COALESCE(SUM(amount) FILTER (WHERE type = 'expense'), 0) AS expenses_sum,
        COALESCE(SUM(amount) FILTER (WHERE type = 'donation'), 0) AS donations_sum,
        COALESCE(SUM(amount) FILTER (WHERE type = 'exempt-income'), 0) AS exempt_income_sum,
        COALESCE(SUM(amount) FILTER (WHERE type = 'recognized-expense'), 0) AS recognized_expenses_sum,
        COALESCE(SUM(amount) FILTER (WHERE type = 'non_tithe_donation'), 0) AS non_tithe_donation_sum
      FROM tx
      GROUP BY currency
    ),
    tx_totals AS (
      SELECT
        COUNT(*)::bigint AS total_transactions,
        COUNT(DISTINCT user_id)::bigint AS users_with_transactions,
        COUNT(DISTINCT user_id) FILTER (
          WHERE created_at > NOW() - INTERVAL '30 days'
        )::bigint AS active_30d
      FROM tx
    )
    SELECT
      t.total_transactions,
      t.users_with_transactions,
      t.active_30d,
      (
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
        FROM currency_stats
      ) AS finance
    FROM tx_totals t
  ) scanned;

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

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats()
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(integer)
  TO authenticated, service_role;
