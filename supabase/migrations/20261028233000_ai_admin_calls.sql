-- Admin view of ai.model_calls for a UTC range. Counts, latency, tokens and cost only.
-- Buckets use the same grain and Monday-UTC weeks as get_admin_ai_stats.

CREATE OR REPLACE FUNCTION public.get_admin_ai_calls(
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
  v_trunc text;
  v_fmt text;
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
  v_trunc := CASE WHEN v_span <= 62 THEN 'day' WHEN v_span <= 366 THEN 'week' ELSE 'month' END;
  v_fmt := CASE v_trunc WHEN 'month' THEN 'YYYY-MM' ELSE 'YYYY-MM-DD' END;

  RETURN json_build_object(
    'first_on', (SELECT (MIN(created_at) AT TIME ZONE 'UTC')::date FROM ai.model_calls),
    'operations', (
      SELECT COALESCE(json_agg(row_to_json(ops) ORDER BY ops.cost_usd DESC, ops.calls DESC), '[]'::json)
      FROM (
        SELECT
          operation,
          COUNT(*)::bigint AS calls,
          COUNT(*) FILTER (WHERE NOT ok)::bigint AS failed,
          round(percentile_cont(0.5) WITHIN GROUP (ORDER BY latency_ms))::integer AS p50_ms,
          round(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms))::integer AS p95_ms,
          COALESCE(SUM(input_tokens), 0)::bigint AS input_tokens,
          COALESCE(SUM(output_tokens), 0)::bigint AS output_tokens,
          COALESCE(SUM(cost_usd), 0)::numeric AS cost_usd,
          mode() WITHIN GROUP (ORDER BY error_code) FILTER (WHERE error_code IS NOT NULL) AS top_error
        FROM ai.model_calls
        WHERE created_at >= v_start AND created_at < v_end
        GROUP BY operation
      ) ops
    ),
    'days', (
      SELECT COALESCE(json_agg(row_to_json(daily) ORDER BY daily.day), '[]'::json)
      FROM (
        SELECT
          to_char((created_at AT TIME ZONE 'UTC')::date, 'YYYY-MM-DD') AS day,
          COUNT(*)::bigint AS calls,
          COALESCE(SUM(cost_usd), 0)::numeric AS cost_usd
        FROM ai.model_calls
        WHERE created_at >= v_start AND created_at < v_end
        GROUP BY 1
      ) daily
    ),
    'model_buckets', (
      SELECT COALESCE(json_agg(row_to_json(buckets) ORDER BY buckets.bucket, buckets.model), '[]'::json)
      FROM (
        SELECT
          to_char(date_trunc(v_trunc, created_at AT TIME ZONE 'UTC'), v_fmt) AS bucket,
          model,
          COUNT(*)::bigint AS calls,
          COALESCE(SUM(cost_usd), 0)::numeric AS cost_usd
        FROM ai.model_calls
        WHERE created_at >= v_start AND created_at < v_end
        GROUP BY 1, 2
      ) buckets
    ),
    'users', (
      SELECT COALESCE(json_agg(row_to_json(per_user)), '[]'::json)
      FROM (
        SELECT
          users.email,
          COUNT(*)::bigint AS calls,
          COUNT(*) FILTER (WHERE NOT calls.ok)::bigint AS failed,
          COALESCE(SUM(calls.cost_usd), 0)::numeric AS cost_usd
        FROM ai.model_calls AS calls
        JOIN auth.users AS users ON users.id = calls.user_id
        WHERE calls.created_at >= v_start AND calls.created_at < v_end
        GROUP BY users.email
        ORDER BY COALESCE(SUM(calls.cost_usd), 0) DESC, COUNT(*) DESC
        LIMIT 30
      ) per_user
    )
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_admin_ai_calls(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_admin_ai_calls(date, date) TO authenticated, service_role;
