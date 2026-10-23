-- Admin counts for stored AI activity. No message text, amounts, or file paths.

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
  v_from date := COALESCE(p_from, CURRENT_DATE - 6);
  v_to date := COALESCE(p_to, CURRENT_DATE);
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Authentication required';
  END IF;
  IF NOT public.is_admin_user() THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;
  IF v_to < v_from OR v_to - v_from > 6 THEN
    RAISE EXCEPTION 'range is at most 7 days';
  END IF;

  v_start := v_from::timestamptz;
  v_end := (v_to + 1)::timestamptz;

  RETURN json_build_object(
    'from', v_from,
    'to', v_to,
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
