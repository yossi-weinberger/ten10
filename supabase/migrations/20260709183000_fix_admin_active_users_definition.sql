-- Align admin "active_30d" with real product activity (transactions),
-- not auth.users.last_sign_in_at (often stale when sessions refresh without a new sign-in).
-- Matches Trends tab active_users definition (distinct users with transactions).

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats(p_days_back integer)
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
    'finance', json_build_object(
      'total_income', COALESCE((
        SELECT SUM(amount)
        FROM transactions
        WHERE type = 'income'
      ), 0),
      'total_expenses', COALESCE((
        SELECT SUM(amount)
        FROM transactions
        WHERE type = 'expense'
      ), 0),
      'total_donations', COALESCE((
        SELECT SUM(amount)
        FROM transactions
        WHERE type = 'donation'
      ), 0),
      'total_recognized_expenses', COALESCE((
        SELECT SUM(amount)
        FROM transactions
        WHERE type = 'recognized-expense'
      ), 0),
      'total_exempt_income', COALESCE((
        SELECT SUM(amount)
        FROM transactions
        WHERE type = 'exempt-income'
      ), 0),
      'total_non_tithe_donation', COALESCE((
        SELECT SUM(amount)
        FROM transactions
        WHERE type = 'non_tithe_donation'
      ), 0),
      'by_currency', COALESCE((
        SELECT json_object_agg(
          currency,
          json_build_object(
            'income', income_sum,
            'expenses', expenses_sum,
            'donations', donations_sum,
            'total_managed', income_sum + expenses_sum + donations_sum
          )
        )
        FROM (
          SELECT
            currency,
            COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income_sum,
            COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses_sum,
            COALESCE(SUM(CASE WHEN type = 'donation' THEN amount ELSE 0 END), 0) as donations_sum
          FROM transactions
          GROUP BY currency
        ) currency_stats
      ), '{}'::json)
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
