-- Restores get_admin_ai_stats and get_admin_dashboard_stats to the definitions this migration replaced.

-- Admin AI counts for a chosen UTC range. No message text, amounts, or file paths.
-- Week buckets are Monday UTC, matching admin-buckets.ts.

CREATE OR REPLACE FUNCTION public.get_admin_ai_stats(
  p_from date,
  p_to date
)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_start timestamptz;
  v_end timestamptz;
  v_span integer;
  v_grain text;
  v_trunc text;
  v_fmt text;
  v_first date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from THEN
    RAISE EXCEPTION 'range is invalid';
  END IF;

  v_start := p_from::timestamp AT TIME ZONE 'UTC';
  v_end := (p_to + 1)::timestamp AT TIME ZONE 'UTC';
  v_span := p_to - p_from;
  v_grain := CASE
    WHEN v_span <= 62 THEN 'day'
    WHEN v_span <= 366 THEN 'week'
    ELSE 'month'
  END;
  v_trunc := CASE v_grain WHEN 'week' THEN 'week' WHEN 'month' THEN 'month' ELSE 'day' END;
  v_fmt := CASE v_grain WHEN 'month' THEN 'YYYY-MM' ELSE 'YYYY-MM-DD' END;

  SELECT MIN(created_on) INTO v_first
  FROM (
    SELECT (MIN(created_at) AT TIME ZONE 'UTC')::date AS created_on FROM ai.intake_items
    UNION ALL
    SELECT (MIN(created_at) AT TIME ZONE 'UTC')::date FROM ai.intake_messages
    UNION ALL
    SELECT (MIN(created_at) AT TIME ZONE 'UTC')::date FROM ai.intake_events
    UNION ALL
    SELECT (MIN(created_at) AT TIME ZONE 'UTC')::date FROM ai.source_artifacts
    UNION ALL
    SELECT (MIN(created_at) AT TIME ZONE 'UTC')::date FROM ai.transaction_source_links
    UNION ALL
    SELECT (MIN(created_at) AT TIME ZONE 'UTC')::date FROM ai.user_rules
    UNION ALL
    SELECT (MIN(created_at) AT TIME ZONE 'UTC')::date FROM ai.question_measurements
  ) dates
  WHERE created_on IS NOT NULL;

  RETURN json_build_object(
    'from', p_from,
    'to', p_to,
    'grain', v_grain,
    'first_on', v_first,
    'drafts', (
      SELECT json_build_object(
        'ready', COUNT(*) FILTER (WHERE status = 'ready'),
        'needs_review', COUNT(*) FILTER (WHERE status = 'needs_review'),
        'approved', COUNT(*) FILTER (WHERE status = 'approved'),
        'rejected', COUNT(*) FILTER (WHERE status = 'rejected'),
        'committed', COUNT(*) FILTER (WHERE status = 'committed'),
        'reverted', COUNT(*) FILTER (WHERE status = 'reverted')
      )
      FROM ai.intake_items
      WHERE created_at >= v_start AND created_at < v_end
    ),
    'messages_by_kind', (
      SELECT COALESCE(json_object_agg(content_kind, n), '{}'::json)
      FROM (
        SELECT content_kind, COUNT(*) AS n
        FROM ai.intake_messages
        WHERE created_at >= v_start AND created_at < v_end
        GROUP BY content_kind
      ) kinds
    ),
    'origins', (
      SELECT json_build_object(
        'ai', COUNT(*) FILTER (WHERE origin = 'ai'),
        'ai_auto', COUNT(*) FILTER (WHERE origin = 'ai_auto')
      )
      FROM public.transactions
      WHERE created_at >= v_start AND created_at < v_end
        AND origin IN ('ai', 'ai_auto')
    ),
    'receipt_links', (
      SELECT COUNT(*)
      FROM ai.transaction_source_links
      WHERE created_at >= v_start AND created_at < v_end
        AND source_artifact_id IS NOT NULL
    ),
    'artifacts', (
      SELECT json_build_object(
        'active', COUNT(*) FILTER (WHERE deleted_at IS NULL),
        'deleted', COUNT(*) FILTER (WHERE deleted_at IS NOT NULL)
      )
      FROM ai.source_artifacts
      WHERE created_at >= v_start AND created_at < v_end
    ),
    'rules_active', (
      SELECT COUNT(*) FROM ai.user_rules WHERE status = 'active'
    ),
    'questions', (
      SELECT COUNT(*)
      FROM ai.question_measurements
      WHERE created_at >= v_start AND created_at < v_end
    ),
    'question_outcomes', (
      SELECT COALESCE(json_object_agg(outcome, n), '{}'::json)
      FROM (
        SELECT COALESCE(quality_signals->>'outcome', 'none') AS outcome, COUNT(*) AS n
        FROM ai.question_measurements
        WHERE created_at >= v_start AND created_at < v_end
        GROUP BY 1
      ) outcomes
    ),
    'buckets', (
      SELECT COALESCE(json_agg(json_build_object(
        'bucket', bucket,
        'committed', committed,
        'rejected', rejected,
        'reverted', reverted,
        'drafts', drafts,
        'text', text_n,
        'receipt', receipt_n,
        'speech', speech_n
      ) ORDER BY bucket), '[]'::json)
      FROM (
        SELECT
          COALESCE(items.bucket, messages.bucket) AS bucket,
          COALESCE(items.committed, 0) AS committed,
          COALESCE(items.rejected, 0) AS rejected,
          COALESCE(items.reverted, 0) AS reverted,
          COALESCE(items.drafts, 0) AS drafts,
          COALESCE(messages.text_n, 0) AS text_n,
          COALESCE(messages.receipt_n, 0) AS receipt_n,
          COALESCE(messages.speech_n, 0) AS speech_n
        FROM (
          SELECT to_char(date_trunc(v_trunc, created_at AT TIME ZONE 'UTC'), v_fmt) AS bucket,
            COUNT(*) FILTER (WHERE status = 'committed') AS committed,
            COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
            COUNT(*) FILTER (WHERE status = 'reverted') AS reverted,
            COUNT(*) AS drafts
          FROM ai.intake_items
          WHERE created_at >= v_start AND created_at < v_end
          GROUP BY 1
        ) items
        FULL OUTER JOIN (
          SELECT to_char(date_trunc(v_trunc, created_at AT TIME ZONE 'UTC'), v_fmt) AS bucket,
            COUNT(*) FILTER (WHERE content_kind = 'text') AS text_n,
            COUNT(*) FILTER (WHERE content_kind IN ('image', 'pdf')) AS receipt_n,
            COUNT(*) FILTER (WHERE content_kind = 'audio') AS speech_n
          FROM ai.intake_messages
          WHERE created_at >= v_start AND created_at < v_end
          GROUP BY 1
        ) messages ON messages.bucket = items.bucket
      ) joined
    ),
    'users', (
      SELECT COALESCE(json_agg(row_to_json(activity)), '[]'::json)
      FROM (
        SELECT users.email,
          SUM(activity.drafts)::bigint AS drafts,
          SUM(activity.committed)::bigint AS committed,
          SUM(activity.questions)::bigint AS questions
        FROM (
          SELECT user_id, COUNT(*)::bigint AS drafts,
            COUNT(*) FILTER (WHERE status = 'committed')::bigint AS committed,
            0::bigint AS questions
          FROM ai.intake_items
          WHERE created_at >= v_start AND created_at < v_end
          GROUP BY user_id
          UNION ALL
          SELECT user_id, 0::bigint, 0::bigint, COUNT(*)::bigint
          FROM ai.question_measurements
          WHERE created_at >= v_start AND created_at < v_end
          GROUP BY user_id
        ) activity
        JOIN auth.users AS users ON users.id = activity.user_id
        GROUP BY users.email
        ORDER BY SUM(activity.drafts) DESC, SUM(activity.questions) DESC
        LIMIT 30
      ) activity
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_ai_stats(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_stats(date, date) TO authenticated, service_role;
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
