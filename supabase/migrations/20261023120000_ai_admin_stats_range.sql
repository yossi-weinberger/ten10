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
