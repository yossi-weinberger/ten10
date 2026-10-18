-- AI intake foundation. Additive only.
-- New objects live in schema ai. public.transactions gains one nullable column.
-- The 13-arg get_user_transactions used by the app is replaced with the same
-- body plus an optional p_origin filter (default NULL). The unused 9-arg and
-- 12-arg overloads are left in place.

CREATE SCHEMA IF NOT EXISTS ai;

REVOKE ALL ON SCHEMA ai FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA ai TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- intake_messages
-- ---------------------------------------------------------------------------
CREATE TABLE ai.intake_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  schema_version integer NOT NULL DEFAULT 1,
  channel text NOT NULL CHECK (channel IN ('web', 'email', 'whatsapp')),
  content_kind text NOT NULL CHECK (content_kind IN ('text', 'image', 'pdf', 'audio', 'mixed')),
  external_message_id text,
  idempotency_key text NOT NULL,
  text_redacted text,
  status text NOT NULL DEFAULT 'received' CHECK (status IN (
    'received', 'queued', 'processing', 'ready', 'needs_clarification',
    'failed', 'committed', 'reverted', 'cancelled', 'expired'
  )),
  attempt_count integer NOT NULL DEFAULT 0,
  error_code text,
  received_at timestamptz NOT NULL,
  processed_at timestamptz,
  expires_at timestamptz,
  timezone text NOT NULL DEFAULT 'Asia/Jerusalem',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, idempotency_key)
);

CREATE UNIQUE INDEX intake_messages_channel_external_id_key
  ON ai.intake_messages (channel, external_message_id)
  WHERE external_message_id IS NOT NULL;

CREATE INDEX intake_messages_user_received_idx
  ON ai.intake_messages (user_id, received_at DESC);

CREATE INDEX intake_messages_active_status_idx
  ON ai.intake_messages (status)
  WHERE status IN ('queued', 'processing', 'needs_clarification');

-- ---------------------------------------------------------------------------
-- source_artifacts
-- ---------------------------------------------------------------------------
CREATE TABLE ai.source_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  intake_message_id uuid NOT NULL REFERENCES ai.intake_messages (id) ON DELETE CASCADE,
  storage_bucket text NOT NULL,
  storage_path text NOT NULL,
  media_type text NOT NULL,
  mime_type text NOT NULL,
  file_size bigint NOT NULL CHECK (file_size >= 0),
  sha256 text NOT NULL,
  page_count integer,
  duration_ms integer,
  retention_mode text NOT NULL DEFAULT 'temporary' CHECK (retention_mode IN ('temporary', 'keep_receipt')),
  expires_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX source_artifacts_user_expires_idx
  ON ai.source_artifacts (user_id, expires_at);

CREATE INDEX source_artifacts_message_idx
  ON ai.source_artifacts (intake_message_id);

-- ---------------------------------------------------------------------------
-- intake_items
-- ---------------------------------------------------------------------------
CREATE TABLE ai.intake_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES ai.intake_messages (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  item_index integer NOT NULL CHECK (item_index >= 0),
  status text NOT NULL DEFAULT 'ready' CHECK (status IN (
    'ready', 'needs_review', 'approved', 'rejected', 'committed', 'reverted'
  )),
  version integer NOT NULL DEFAULT 1,
  draft_schema_version integer NOT NULL DEFAULT 1,
  normalized_payload jsonb NOT NULL,
  quality_signals jsonb,
  evidence jsonb,
  validation_errors text[] NOT NULL DEFAULT '{}',
  duplicate_of_transaction_id uuid,
  prompt_version text,
  model_route text,
  committed_transaction_id uuid UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, item_index)
);

CREATE INDEX intake_items_user_status_created_idx
  ON ai.intake_items (user_id, status, created_at DESC);

-- ---------------------------------------------------------------------------
-- transaction_source_links
-- ---------------------------------------------------------------------------
CREATE TABLE ai.transaction_source_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES public.transactions (id) ON DELETE CASCADE,
  source_artifact_id uuid REFERENCES ai.source_artifacts (id) ON DELETE SET NULL,
  intake_item_id uuid NOT NULL REFERENCES ai.intake_items (id),
  item_index integer,
  page_number integer,
  confidence numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX transaction_source_links_transaction_idx
  ON ai.transaction_source_links (transaction_id);

CREATE INDEX transaction_source_links_item_idx
  ON ai.transaction_source_links (intake_item_id);

-- ---------------------------------------------------------------------------
-- intake_events (service role only)
-- ---------------------------------------------------------------------------
CREATE TABLE ai.intake_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES ai.intake_messages (id) ON DELETE CASCADE,
  item_id uuid REFERENCES ai.intake_items (id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_status text,
  to_status text,
  actor_type text NOT NULL,
  actor_id uuid,
  trace_id text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX intake_events_message_idx ON ai.intake_events (message_id, created_at);

-- ---------------------------------------------------------------------------
-- user_rules, duplicate scans
-- ---------------------------------------------------------------------------
CREATE TABLE ai.user_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  match jsonb NOT NULL,
  action jsonb NOT NULL,
  effective_from date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'disabled')),
  version integer NOT NULL DEFAULT 1,
  created_via text NOT NULL CHECK (created_via IN ('assistant', 'settings')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX user_rules_user_status_idx ON ai.user_rules (user_id, status);

CREATE TABLE ai.duplicate_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'queued',
  requested_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  result jsonb,
  expires_at timestamptz
);

CREATE INDEX duplicate_scans_user_requested_idx
  ON ai.duplicate_scans (user_id, requested_at DESC);

CREATE TABLE ai.duplicate_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  transaction_a uuid NOT NULL,
  transaction_b uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (transaction_a < transaction_b),
  UNIQUE (user_id, transaction_a, transaction_b)
);

-- ---------------------------------------------------------------------------
-- Grants and RLS. Authenticated users can read their own rows. No writes.
-- ---------------------------------------------------------------------------
ALTER TABLE ai.intake_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.source_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.intake_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.transaction_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.intake_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.user_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.duplicate_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.duplicate_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY intake_messages_select ON ai.intake_messages
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY source_artifacts_select ON ai.source_artifacts
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY intake_items_select ON ai.intake_items
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY transaction_source_links_select ON ai.transaction_source_links
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.transactions t
      WHERE t.id = transaction_id
        AND t.user_id = (SELECT auth.uid())
    )
  );

CREATE POLICY user_rules_select ON ai.user_rules
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY duplicate_scans_select ON ai.duplicate_scans
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY duplicate_dismissals_select ON ai.duplicate_dismissals
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON
  ai.intake_messages,
  ai.source_artifacts,
  ai.intake_items,
  ai.transaction_source_links,
  ai.user_rules,
  ai.duplicate_scans,
  ai.duplicate_dismissals
TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA ai TO service_role;

REVOKE ALL ON ai.intake_events FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- transactions.origin. Nullable. Existing writers do not set it.
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions
  ADD COLUMN origin text;

ALTER TABLE public.transactions
  ADD CONSTRAINT transactions_origin_check
  CHECK (origin IS NULL OR origin IN ('ai', 'ai_auto'));

CREATE INDEX transactions_ai_origin_idx
  ON public.transactions (user_id, date DESC)
  WHERE origin IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Replace the in-use get_user_transactions overload. Same behavior when
-- p_origin is omitted. t.* already includes the new column in the JSON.
-- ---------------------------------------------------------------------------
DROP FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[], text[]
);

CREATE FUNCTION public.get_user_transactions(
  p_user_id uuid,
  p_offset integer,
  p_limit integer,
  p_date_from text,
  p_date_to text,
  p_types text[],
  p_search text,
  p_sort_field text,
  p_sort_direction text,
  p_is_recurring boolean,
  p_recurring_statuses text[],
  p_recurring_frequencies text[],
  p_payment_methods text[],
  p_origin text DEFAULT NULL
)
RETURNS TABLE(transactions jsonb, total_count bigint)
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  sort_field TEXT;
  sort_direction TEXT;
  sql TEXT;
BEGIN
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
    WHEN 'origin' THEN 'origin'
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
        AND ($12 IS NULL OR $12 = '' OR t.origin = $12)
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
    USING
      p_user_id,
      p_date_from,
      p_date_to,
      p_types,
      p_search,
      p_is_recurring,
      p_recurring_statuses,
      p_recurring_frequencies,
      p_payment_methods,
      p_offset,
      p_limit,
      p_origin;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[], text[], text
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.get_user_transactions(
  uuid, integer, integer, text, text, text[], text, text, text,
  boolean, text[], text[], text[], text
) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Private intake artifacts bucket. One size cap (20 MiB). Tighter per-type
-- limits are enforced in application code later.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'intake-artifacts',
  'intake-artifacts',
  false,
  20971520,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
    'audio/webm'
  ]
)
ON CONFLICT (id) DO NOTHING;

DO $check$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'transactions'
      AND column_name = 'origin'
  ) THEN
    RAISE EXCEPTION 'transactions.origin was not created';
  END IF;

  IF to_regprocedure('public.get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[],text[],text)') IS NULL THEN
    RAISE EXCEPTION 'get_user_transactions with p_origin is missing';
  END IF;
END;
$check$;
