-- Manual rollback for 20261103100000_ai_intake.sql: back to prod as it was before the AI merge.
-- Checked on a copy of prod's schema: forward, then this file, gives the same schema and grants as before.
-- Drops every AI table, so all AI data goes. Saved transactions stay; only their origin column goes.
-- After running it: supabase migration repair --status reverted 20261103100000

SET check_function_bodies = false;

-- ---------------------------------------------------------------------------
-- Cron jobs
-- ---------------------------------------------------------------------------
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ai-model-calls-retention';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ai-purge-expired-receipts';
SELECT cron.unschedule(jobid) FROM cron.job WHERE jobname = 'ai-usage-cleanup';

-- ---------------------------------------------------------------------------
-- New public functions (the AI RPCs and get_user_transactions with p_origin)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.ai_question_totals(text[], date, date, text, text, text, text);
DROP FUNCTION IF EXISTS public.approve_ai_user_rule(text, text, date);
DROP FUNCTION IF EXISTS public.attach_ai_receipt_artifact(uuid, uuid);
DROP FUNCTION IF EXISTS public.commit_ai_intake_items(jsonb);
DROP FUNCTION IF EXISTS public.consume_ai_call(uuid);
DROP FUNCTION IF EXISTS public.consume_ai_usage(uuid, text, uuid, text);
DROP FUNCTION IF EXISTS public.create_ai_text_intake(jsonb);
DROP FUNCTION IF EXISTS public.create_ai_text_intake_items(jsonb);
DROP FUNCTION IF EXISTS public.disable_ai_user_rule(text, text);
DROP FUNCTION IF EXISTS public.dismiss_ai_duplicate_pair(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_admin_ai_calls(date, date);
DROP FUNCTION IF EXISTS public.get_admin_ai_stats(date, date);
DROP FUNCTION IF EXISTS public.get_user_transactions(uuid, integer, integer, text, text, text[], text, text, text, boolean, text[], text[], text[], text);
DROP FUNCTION IF EXISTS public.list_ai_duplicate_candidates(text, date, numeric, text);
DROP FUNCTION IF EXISTS public.list_ai_reader_rules(uuid);
DROP FUNCTION IF EXISTS public.list_ai_recipients();
DROP FUNCTION IF EXISTS public.list_ai_saved_duplicate_pairs();
DROP FUNCTION IF EXISTS public.list_ai_user_rules();
DROP FUNCTION IF EXISTS public.list_expired_receipt_artifacts();
DROP FUNCTION IF EXISTS public.mark_ai_question_outcome(uuid, text);
DROP FUNCTION IF EXISTS public.mark_receipt_artifacts_deleted(uuid[]);
DROP FUNCTION IF EXISTS public.read_ai_shadow_type_context(uuid);
DROP FUNCTION IF EXISTS public.receipt_artifact_id_for_path(uuid, text);
DROP FUNCTION IF EXISTS public.receipt_artifact_path(uuid, uuid);
DROP FUNCTION IF EXISTS public.receipt_storage_path(uuid, uuid);
DROP FUNCTION IF EXISTS public.record_ai_model_call(uuid, text, text, boolean, integer, text, integer, integer, integer, numeric, text);
DROP FUNCTION IF EXISTS public.record_ai_receipt_artifact(uuid, text, text, bigint, text);
DROP FUNCTION IF EXISTS public.record_ai_shadow_category(uuid, uuid, text, numeric);
DROP FUNCTION IF EXISTS public.record_ai_shadow_type(uuid, uuid, text, numeric);
DROP FUNCTION IF EXISTS public.record_ai_slot_confidence(uuid, jsonb);
DROP FUNCTION IF EXISTS public.reject_uncommitted_ai_item(uuid);
DROP FUNCTION IF EXISTS public.release_ai_usage(uuid);
DROP FUNCTION IF EXISTS public.undo_ai_intake_commit(uuid);
DROP FUNCTION IF EXISTS public.undo_ai_transaction(uuid);

-- ---------------------------------------------------------------------------
-- Schema ai and everything in it
-- ---------------------------------------------------------------------------
DROP SCHEMA IF EXISTS ai CASCADE;

-- ---------------------------------------------------------------------------
-- Functions as they were on prod
-- ---------------------------------------------------------------------------
CREATE FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[], p_payment_methods text[]) RETURNS TABLE(transactions jsonb, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  sort_field TEXT;
  sort_direction TEXT;
  sql TEXT;
BEGIN
  -- Use unqualified column names (aliases not in scope in paged CTE)
  sort_field := CASE p_sort_field
    WHEN 'date' THEN 'date'
    WHEN 'amount' THEN 'amount'
    WHEN 'description' THEN 'description'
    WHEN 'currency' THEN 'currency'
    WHEN 'type' THEN 'type'
    WHEN 'category' THEN 'category'
    WHEN 'recipient' THEN 'recipient'
    WHEN 'payment_method' THEN 'payment_method'
    WHEN 'is_chomesh' THEN 'is_chomesh'
    WHEN 'created_at' THEN 'created_at'
    WHEN 'updated_at' THEN 'updated_at'
    ELSE 'created_at'
  END;

  sort_direction := CASE WHEN lower(p_sort_direction) = 'asc' THEN 'ASC' ELSE 'DESC' END;

  sql := format($f$
    WITH filtered AS (
      SELECT
        t.*,
        rt.status AS recurring_status,
        rt.frequency AS recurring_frequency,
        rt.execution_count AS recurring_execution_count,
        rt.total_occurrences AS recurring_total_occurrences,
        rt.day_of_month AS recurring_day_of_month_def,
        rt.start_date AS recurring_start_date,
        rt.next_due_date AS recurring_next_due_date
      FROM transactions t
      LEFT JOIN recurring_transactions rt ON t.source_recurring_id = rt.id
      WHERE t.user_id = $1
        AND ($2 IS NULL OR t.date >= NULLIF($2, '')::date)
        AND ($3 IS NULL OR t.date <= NULLIF($3, '')::date)
        AND ($4 IS NULL OR t.type = ANY($4))
        AND (
          $5 IS NULL OR $5 = '' OR
          t.description ILIKE '%%' || $5 || '%%' OR
          t.category ILIKE '%%' || $5 || '%%' OR
          t.recipient ILIKE '%%' || $5 || '%%' OR
          t.payment_method ILIKE '%%' || $5 || '%%'
        )
        AND ($9 IS NULL OR t.payment_method = ANY($9))
        AND (
          $6 IS NULL OR
          ($6 = true AND t.source_recurring_id IS NOT NULL) OR
          ($6 = false AND t.source_recurring_id IS NULL)
        )
        AND ($7 IS NULL OR rt.status = ANY($7))
        AND ($8 IS NULL OR rt.frequency = ANY($8))
    ),
    counted AS (
      SELECT COUNT(*)::BIGINT AS total_count FROM filtered
    ),
    paged AS (
      SELECT * FROM filtered
      ORDER BY %s %s
      OFFSET $10 LIMIT $11
    )
    SELECT
      COALESCE(
        jsonb_agg(
          (to_jsonb(p) -
            'recurring_status' -
            'recurring_frequency' -
            'recurring_execution_count' -
            'recurring_total_occurrences' -
            'recurring_day_of_month_def' -
            'recurring_start_date' -
            'recurring_next_due_date'
          ) ||
          jsonb_build_object(
            'recurring_info',
            CASE
              WHEN p.recurring_status IS NULL THEN NULL
              ELSE jsonb_build_object(
                'status', p.recurring_status,
                'frequency', p.recurring_frequency,
                'execution_count', p.recurring_execution_count,
                'total_occurrences', p.recurring_total_occurrences,
                'day_of_month', p.recurring_day_of_month_def,
                'start_date', p.recurring_start_date,
                'next_due_date', p.recurring_next_due_date
              )
            END
          )
        ),
        '[]'::jsonb
      ) AS transactions,
      (SELECT total_count FROM counted) AS total_count
    FROM paged p;
  $f$, sort_field, sort_direction);

  RETURN QUERY EXECUTE sql
    USING p_user_id, p_date_from, p_date_to, p_types, p_search, p_is_recurring, p_recurring_statuses, p_recurring_frequencies, p_payment_methods, p_offset, p_limit;
END;
$_$;
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats() RETURNS json
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
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
$$;
REVOKE ALL ON FUNCTION public.get_user_transactions(uuid, integer, integer, text, text, text[], text, text, text, boolean, text[], text[], text[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[], p_payment_methods text[]) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[], p_payment_methods text[]) TO service_role;
REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats() FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_admin_dashboard_stats() TO authenticated;
GRANT ALL ON FUNCTION public.get_admin_dashboard_stats() TO service_role;

-- ---------------------------------------------------------------------------
-- Origin columns on existing tables (their checks, index and comment go with them)
-- ---------------------------------------------------------------------------
DROP INDEX IF EXISTS public.transactions_ai_origin_idx;
ALTER TABLE public.transactions DROP COLUMN IF EXISTS origin;
ALTER TABLE public.recurring_transactions DROP COLUMN IF EXISTS origin;

-- ---------------------------------------------------------------------------
-- Receipt bucket
-- ---------------------------------------------------------------------------
-- Not deleted here. Hosted Supabase refuses every SQL delete on storage tables (storage.protect_delete,
-- 42501), even for an empty bucket, and that error aborted this whole rollback on the staging rehearsal
-- (2026-11-09). After this file commits, empty and delete the bucket through the Storage API, service role:
--   POST   <SUPABASE_URL>/storage/v1/bucket/intake-artifacts/empty
--   DELETE <SUPABASE_URL>/storage/v1/bucket/intake-artifacts
-- or in the dashboard: Storage, intake-artifacts, Empty bucket, then Delete bucket. Emptying is queued; if the
-- delete says the bucket is not empty, wait for the empty to finish and delete again.

RESET check_function_bodies;
