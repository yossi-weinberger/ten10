-- Ten10 AI intake: the final state of the 46 development migrations in one file.
-- Generated from a replay on prod's schema and checked: applying this file gives the same schema,
-- grants, policies, cron jobs and bucket as applying the 46 files. Full rollback:
-- rollback/20261103100000_ai_intake_down.sql.
--
-- One change against the 46 files: no trial allowlist in SQL. The receipt and slot RPCs are
-- service_role only, and the Edge functions check AI_TRIAL_ONLY before they call them, so the
-- trial switch is that one variable; the SQL setting is gone.

SET check_function_bodies = false;

-- ---------------------------------------------------------------------------
-- Replaced: get_user_transactions gains p_origin (same result shape)
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.get_user_transactions(uuid, integer, integer, text, text, text[], text, text, text, boolean, text[], text[], text[]);

-- ---------------------------------------------------------------------------
-- Existing tables: origin columns
-- ---------------------------------------------------------------------------
ALTER TABLE public.transactions ADD COLUMN origin text;
ALTER TABLE public.transactions ADD CONSTRAINT transactions_origin_check CHECK (((origin IS NULL) OR (origin = ANY (ARRAY['ai'::text, 'ai_auto'::text]))));
ALTER TABLE public.recurring_transactions ADD COLUMN origin text;
ALTER TABLE public.recurring_transactions ADD CONSTRAINT recurring_transactions_origin_check CHECK (((origin IS NULL) OR (origin = 'ai'::text)));

-- ---------------------------------------------------------------------------
-- schemas
-- ---------------------------------------------------------------------------
CREATE SCHEMA ai;

-- ---------------------------------------------------------------------------
-- functions
-- ---------------------------------------------------------------------------
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
      'users_with_transactions', scanned.users_with_transactions,
      'ai_transactions', scanned.ai_transactions,
      'ai_users', scanned.ai_users
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
        origin,
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
        )::bigint AS active_30d,
        COUNT(*) FILTER (WHERE origin IS NOT NULL)::bigint AS ai_transactions,
        COUNT(DISTINCT user_id) FILTER (WHERE origin IS NOT NULL)::bigint AS ai_users
      FROM tx
    )
    SELECT
      t.total_transactions,
      t.users_with_transactions,
      t.active_30d,
      t.ai_transactions,
      t.ai_users,
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
CREATE FUNCTION ai.approve_user_rule(p_name text, p_type text, p_effective_from date) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := lower(btrim(coalesce(p_name, '')));
  v_existing uuid;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF char_length(v_name) < 2 OR char_length(v_name) > 80
     OR p_type NOT IN ('exempt-income', 'recognized-expense', 'non_tithe_donation')
     OR p_effective_from IS NULL THEN
    RAISE EXCEPTION 'RULE_NOT_READY';
  END IF;

  SELECT id
  INTO v_existing
  FROM ai.user_rules
  WHERE user_id = v_uid
    AND status = 'active'
    AND match->>'name' = v_name
    AND action->>'type' = p_type
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('rule_id', v_existing, 'alreadyActive', true);
  END IF;

  INSERT INTO ai.user_rules (
    user_id,
    match,
    action,
    effective_from,
    status,
    created_via
  ) VALUES (
    v_uid,
    jsonb_build_object('name', v_name),
    jsonb_build_object('type', p_type),
    p_effective_from,
    'active',
    'assistant'
  )
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('rule_id', v_id, 'alreadyActive', false);
END;
$$;
CREATE FUNCTION ai.attach_receipt_artifact(p_item_id uuid, p_artifact_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  UPDATE ai.transaction_source_links AS link
  SET source_artifact_id = p_artifact_id
  WHERE link.intake_item_id = p_item_id
    AND link.source_artifact_id IS NULL
    AND EXISTS (
      SELECT 1
      FROM ai.intake_items AS item
      WHERE item.id = p_item_id
        AND item.user_id = v_uid
    )
    AND EXISTS (
      SELECT 1
      FROM ai.source_artifacts AS artifact
      WHERE artifact.id = p_artifact_id
        AND artifact.user_id = v_uid
        AND artifact.deleted_at IS NULL
    )
    AND EXISTS (
      SELECT 1
      FROM public.transactions AS saved
      WHERE saved.id = link.transaction_id
        AND saved.user_id = v_uid
    );

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count = 1;
END;
$$;
CREATE FUNCTION ai.commit_intake_items(p_items jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_default text;
  v_elem jsonb;
  v_id uuid;
  v_expected integer;
  v_ack boolean;
  v_item ai.intake_items%ROWTYPE;
  v_payload jsonb;
  v_type text;
  v_amount numeric;
  v_original numeric;
  v_rate numeric;
  v_currency text;
  v_original_currency text;
  v_rate_source text;
  v_tx uuid;
  v_ids jsonb := '[]'::jsonb;
  v_already jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF jsonb_typeof(p_items) IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'DRAFT_NOT_READY';
  END IF;

  SELECT coalesce(nullif(upper(trim(default_currency)), ''), 'ILS')
  INTO v_default
  FROM public.profiles
  WHERE id = v_uid;

  IF v_default IS NULL THEN
    RAISE EXCEPTION 'OWNERSHIP_DENIED';
  END IF;

  FOR v_elem IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_id := (v_elem->>'id')::uuid;
    v_expected := (v_elem->>'expected_version')::integer;
    v_ack := coalesce((v_elem->>'acknowledge_duplicate')::boolean, false);

    SELECT *
    INTO v_item
    FROM ai.intake_items
    WHERE id = v_id
      AND user_id = v_uid
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'OWNERSHIP_DENIED';
    END IF;

    IF v_item.status = 'committed' AND v_item.committed_transaction_id IS NOT NULL THEN
      v_already := v_already || to_jsonb(v_item.committed_transaction_id);
      CONTINUE;
    END IF;

    IF v_item.version IS DISTINCT FROM v_expected THEN
      RAISE EXCEPTION 'VERSION_CONFLICT';
    END IF;

    IF v_item.status NOT IN ('approved', 'ready') THEN
      RAISE EXCEPTION 'DRAFT_NOT_READY';
    END IF;

    IF v_item.duplicate_of_transaction_id IS NOT NULL AND NOT v_ack THEN
      RAISE EXCEPTION 'DUPLICATE_NOT_ACKNOWLEDGED';
    END IF;

    v_payload := v_item.normalized_payload;
    v_original := NULL;
    v_rate := NULL;
    v_type := v_payload->>'type';
    v_amount := (v_payload->>'amount')::numeric;
    v_currency := upper(trim(v_payload->>'currency'));
    v_original_currency := nullif(upper(trim(v_payload->>'original_currency')), '');
    v_rate_source := nullif(v_payload->>'rate_source', '');

    IF v_type IS NULL OR v_type NOT IN (
      'income', 'expense', 'donation', 'exempt-income',
      'recognized-expense', 'non_tithe_donation'
    ) THEN
      RAISE EXCEPTION 'DRAFT_NOT_READY';
    END IF;

    IF v_amount IS NULL OR v_currency IS NULL OR (v_payload->>'date') IS NULL THEN
      RAISE EXCEPTION 'DRAFT_NOT_READY';
    END IF;

    IF v_currency IS DISTINCT FROM v_default THEN
      IF v_original_currency IS NULL THEN
        RAISE EXCEPTION 'FOREIGN_CURRENCY_NOT_CONVERTED';
      END IF;
      RAISE EXCEPTION 'DEFAULT_CURRENCY_CHANGED';
    END IF;

    IF v_original_currency IS NULL THEN
      IF v_payload ? 'original_amount'
         OR v_payload ? 'conversion_rate'
         OR v_payload ? 'conversion_date'
         OR v_payload ? 'rate_source' THEN
        IF v_payload->>'original_amount' IS NOT NULL
           OR v_payload->>'conversion_rate' IS NOT NULL
           OR v_payload->>'conversion_date' IS NOT NULL
           OR v_rate_source IS NOT NULL THEN
          RAISE EXCEPTION 'FOREIGN_CURRENCY_NOT_CONVERTED';
        END IF;
      END IF;
    ELSE
      v_original := (v_payload->>'original_amount')::numeric;
      v_rate := (v_payload->>'conversion_rate')::numeric;
      IF v_original IS NULL
         OR v_rate IS NULL
         OR v_rate <= 0
         OR v_rate_source NOT IN ('auto', 'manual')
         OR (v_payload->>'conversion_date') IS NULL THEN
        RAISE EXCEPTION 'FOREIGN_CURRENCY_NOT_CONVERTED';
      END IF;
      -- One cent of slack: the form uses toFixed(2), which is not SQL round().
      IF abs(v_amount - round(v_original * v_rate, 2)) > 0.01 THEN
        RAISE EXCEPTION 'FOREIGN_CURRENCY_NOT_CONVERTED';
      END IF;
    END IF;

    INSERT INTO public.transactions (
      user_id,
      date,
      amount,
      currency,
      description,
      type,
      category,
      is_chomesh,
      recipient,
      payment_method,
      original_amount,
      original_currency,
      conversion_rate,
      conversion_date,
      rate_source,
      origin
    ) VALUES (
      v_uid,
      (v_payload->>'date')::date,
      v_amount,
      v_currency,
      v_payload->>'description',
      v_type,
      v_payload->>'category',
      CASE
        WHEN v_payload->>'is_chomesh' IS NULL THEN NULL
        ELSE (v_payload->>'is_chomesh')::boolean
      END,
      v_payload->>'recipient',
      v_payload->>'payment_method',
      CASE WHEN v_original_currency IS NULL THEN NULL ELSE v_original END,
      v_original_currency,
      CASE WHEN v_original_currency IS NULL THEN NULL ELSE v_rate END,
      CASE
        WHEN v_original_currency IS NULL THEN NULL
        ELSE (v_payload->>'conversion_date')::date
      END,
      v_rate_source,
      'ai'
    )
    RETURNING id INTO v_tx;

    INSERT INTO ai.transaction_source_links (
      transaction_id,
      intake_item_id,
      item_index
    ) VALUES (
      v_tx,
      v_item.id,
      v_item.item_index
    );

    UPDATE ai.intake_items
    SET status = 'committed',
        committed_transaction_id = v_tx,
        version = version + 1,
        updated_at = now()
    WHERE id = v_item.id;

    INSERT INTO ai.intake_events (
      message_id,
      item_id,
      event_type,
      from_status,
      to_status,
      actor_type,
      actor_id
    ) VALUES (
      v_item.message_id,
      v_item.id,
      'committed',
      v_item.status,
      'committed',
      'user',
      v_uid
    );

    v_ids := v_ids || to_jsonb(v_tx);
  END LOOP;

  RETURN jsonb_build_object(
    'transaction_ids', v_ids,
    'already_committed', v_already
  );
END;
$$;
CREATE FUNCTION ai.consume_call(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_reason text;
BEGIN
  -- A helper call carries no weight, but it stops with the monthly allowance like every other call.
  IF EXISTS (
    SELECT 1 FROM ai.usage_counters
    WHERE user_id = p_user_id
      AND period_start = date_trunc('month', now() AT TIME ZONE 'UTC')::date
      AND units_used >= ai.usage_quota(p_user_id)
  ) THEN
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exhausted');
  END IF;
  v_reason := ai.take_call(p_user_id);
  RETURN jsonb_build_object('allowed', v_reason IS NULL, 'reason', v_reason);
END;
$$;
CREATE FUNCTION ai.consume_usage(p_user_id uuid, p_kind text, p_turn uuid DEFAULT NULL, p_op text DEFAULT NULL) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_weight integer := ai.usage_weight(p_kind);
  v_quota integer := ai.usage_quota(p_user_id);
  v_period date := date_trunc('month', now() AT TIME ZONE 'UTC')::date;
  v_resets timestamptz := ((date_trunc('month', now() AT TIME ZONE 'UTC') + interval '1 month') AT TIME ZONE 'UTC');
  v_reason text;
  v_used integer;
  v_usage_id uuid;
  v_joined boolean;
BEGIN
  IF v_weight IS NULL THEN
    RAISE EXCEPTION 'USAGE_KIND_INVALID';
  END IF;

  v_reason := ai.take_call(p_user_id);
  IF v_reason IS NOT NULL THEN
    RETURN jsonb_build_object('allowed', false, 'reason', v_reason, 'resets_at', v_resets);
  END IF;

  -- One message, one charge: its classify, split and question calls bring the same turn and join the
  -- first call's charge. Each operation joins once, only while the charge is fresh and not given back;
  -- otherwise the call pays on its own. The first call of a turn holds the row, so calls that arrive
  -- together still charge once.
  IF p_turn IS NOT NULL THEN
    INSERT INTO ai.usage_events AS charge (user_id, kind, units, period_start, turn_id, ops)
    VALUES (p_user_id, p_kind, v_weight, v_period, p_turn, ARRAY[p_op])
    ON CONFLICT (user_id, turn_id) WHERE turn_id IS NOT NULL
    DO UPDATE SET ops = charge.ops || p_op
    WHERE charge.released_at IS NULL
      AND charge.created_at > now() - interval '2 minutes'
      AND NOT p_op = ANY (charge.ops)
    RETURNING id, cardinality(ops) > 1 INTO v_usage_id, v_joined;
    IF v_joined THEN
      RETURN jsonb_build_object('allowed', true, 'reason', NULL, 'usage_id', v_usage_id, 'resets_at', v_resets);
    END IF;
  END IF;

  INSERT INTO ai.usage_counters AS counter (user_id, period_start, units_used)
  SELECT p_user_id, v_period, v_weight
  WHERE v_weight <= v_quota
  ON CONFLICT (user_id, period_start)
  DO UPDATE SET units_used = counter.units_used + v_weight
  WHERE counter.units_used + v_weight <= v_quota
  RETURNING units_used INTO v_used;

  IF v_used IS NULL THEN
    -- A turn row that was never charged must not be joined.
    DELETE FROM ai.usage_events WHERE id = v_usage_id;
    UPDATE ai.usage_rate SET calls = greatest(calls - 1, 0)
    WHERE user_id = p_user_id
      AND ((bucket = 'day' AND bucket_start = date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')
        OR (bucket = 'minute' AND bucket_start = date_trunc('minute', now())));
    RETURN jsonb_build_object('allowed', false, 'reason', 'quota_exhausted', 'resets_at', v_resets);
  END IF;

  IF v_usage_id IS NULL THEN
    INSERT INTO ai.usage_events (user_id, kind, units, period_start)
    VALUES (p_user_id, p_kind, v_weight, v_period)
    RETURNING id INTO v_usage_id;
  END IF;

  RETURN jsonb_build_object(
    'allowed', true,
    'reason', NULL,
    'usage_id', v_usage_id,
    'units_left', v_quota - v_used,
    'resets_at', v_resets
  );
END;
$$;
CREATE FUNCTION ai.create_text_intake(p_payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $_$
DECLARE
  v_uid uuid := auth.uid();
  v_message_id uuid;
  v_item_id uuid;
  v_version integer;
  v_key text;
  v_type text;
  v_amount numeric;
  v_extracted numeric;
  v_basis numeric;
  v_user_edited boolean;
  v_choice text;
  v_candidates jsonb := '[]'::jsonb;
  v_check_amount numeric;
  v_check_currency text;
  v_status text;
  v_duplicate_of uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_type := p_payload->>'type';
  v_amount := (p_payload->>'amount')::numeric;
  v_key := coalesce(nullif(p_payload->>'idempotency_key', ''), gen_random_uuid()::text);

  IF v_type IS NULL OR v_type NOT IN (
    'income', 'expense', 'donation', 'exempt-income',
    'recognized-expense', 'non_tithe_donation'
  ) OR v_amount IS NULL OR v_amount = 0
     OR nullif(p_payload->>'currency', '') IS NULL
     OR (p_payload->>'date') !~ '^\d{4}-\d{2}-\d{2}$' THEN
    RAISE EXCEPTION 'DRAFT_NOT_READY';
  END IF;

  IF (p_payload->>'extracted_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    v_extracted := (p_payload->>'extracted_amount')::numeric;
  ELSIF nullif(upper(btrim(p_payload->>'original_currency')), '') IS NULL
    AND (p_payload->>'original_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    v_extracted := (p_payload->>'original_amount')::numeric;
  END IF;

  v_basis := CASE
    WHEN nullif(upper(btrim(p_payload->>'original_currency')), '') IS NOT NULL
      AND (p_payload->>'original_amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN (p_payload->>'original_amount')::numeric
    ELSE v_amount
  END;

  IF v_extracted IS NULL THEN
    v_extracted := v_basis;
  END IF;

  v_user_edited :=
    lower(btrim(coalesce(p_payload->>'description', '')))
      IS DISTINCT FROM lower(btrim(coalesce(
        p_payload->>'original_description',
        p_payload->>'description',
        ''
      )))
    OR v_extracted IS DISTINCT FROM v_basis;

  v_choice := p_payload->>'duplicate_choice';
  IF v_choice IS DISTINCT FROM 'saved_anyway' AND v_choice IS DISTINCT FROM 'same_event' THEN
    v_choice := NULL;
  END IF;

  v_check_amount := v_basis;
  v_check_currency := coalesce(
    nullif(upper(btrim(p_payload->>'original_currency')), ''),
    upper(btrim(p_payload->>'currency'))
  );

  IF v_choice IS NOT NULL AND jsonb_typeof(p_payload->'duplicate_candidate_ids') = 'array' THEN
    SELECT coalesce(
      jsonb_agg(jsonb_build_object('id', found.id, 'kind', found.kind)),
      '[]'::jsonb
    )
    INTO v_candidates
    FROM (
      SELECT match.id, match.kind
      FROM ai.matching_duplicate_candidates(
        v_uid,
        v_type,
        (p_payload->>'date')::date,
        v_check_amount,
        v_check_currency
      ) AS match
      WHERE match.id IN (
        SELECT jsonb_array_elements_text(p_payload->'duplicate_candidate_ids')
      )
      LIMIT 20
    ) AS found;
  END IF;

  IF v_choice = 'same_event' AND v_candidates = '[]'::jsonb THEN
    RAISE EXCEPTION 'DRAFT_NOT_READY';
  END IF;

  IF v_candidates = '[]'::jsonb THEN
    v_choice := NULL;
  END IF;

  v_status := CASE WHEN v_choice = 'same_event' THEN 'rejected' ELSE 'ready' END;
  v_duplicate_of := CASE
    WHEN v_choice = 'same_event' AND v_candidates->0->>'kind' = 'transaction'
      THEN (v_candidates->0->>'id')::uuid
    ELSE NULL
  END;

  IF nullif(upper(btrim(p_payload->>'original_currency')), '') IS NULL THEN
    p_payload := p_payload
      - 'original_amount'
      - 'conversion_rate'
      - 'conversion_date'
      - 'rate_source';
  END IF;

  INSERT INTO ai.intake_messages (
    user_id,
    channel,
    content_kind,
    idempotency_key,
    text_redacted,
    status,
    received_at,
    timezone
  ) VALUES (
    v_uid,
    'web',
    'text',
    v_key,
    left(coalesce(p_payload->>'description', ''), 500),
    'ready',
    now(),
    coalesce(nullif(p_payload->>'timezone', ''), 'Asia/Jerusalem')
  )
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_message_id;

  IF v_message_id IS NULL THEN
    SELECT item.id, item.version
    INTO v_item_id, v_version
    FROM ai.intake_items item
    JOIN ai.intake_messages message ON message.id = item.message_id
    WHERE message.user_id = v_uid
      AND message.idempotency_key = v_key
      AND item.item_index = 0;

    IF v_item_id IS NULL THEN
      RAISE EXCEPTION 'DRAFT_NOT_READY';
    END IF;

    RETURN jsonb_build_object(
      'item_id', v_item_id,
      'version', v_version,
      'skip_commit', false
    );
  END IF;

  INSERT INTO ai.intake_items (
    message_id,
    user_id,
    item_index,
    status,
    normalized_payload,
    quality_signals,
    duplicate_of_transaction_id
  ) VALUES (
    v_message_id,
    v_uid,
    0,
    v_status,
    p_payload,
    jsonb_build_object(
      'shadow_auto_save', ai.shadow_auto_save(v_uid, p_payload),
      'user_edited', v_user_edited
    ) || CASE
      WHEN v_choice IS NULL THEN '{}'::jsonb
      ELSE jsonb_build_object(
        'duplicate_warning',
        jsonb_build_object('choice', v_choice, 'candidate_ids', v_candidates)
      )
    END,
    v_duplicate_of
  )
  RETURNING id, version INTO v_item_id, v_version;

  IF v_choice IS NOT NULL THEN
    INSERT INTO ai.intake_events (
      message_id,
      item_id,
      event_type,
      to_status,
      actor_type,
      actor_id,
      metadata
    ) VALUES (
      v_message_id,
      v_item_id,
      'duplicate_choice',
      v_status,
      'user',
      v_uid,
      jsonb_build_object('choice', v_choice, 'candidate_ids', v_candidates)
    );
  END IF;

  RETURN jsonb_build_object(
    'item_id', v_item_id,
    'version', v_version,
    'skip_commit', v_choice = 'same_event'
  );
END;
$_$;
CREATE FUNCTION ai.create_text_intake_items(p_payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $_$
DECLARE
  v_uid uuid := auth.uid();
  v_key text;
  v_items jsonb;
  v_item jsonb;
  v_draft jsonb;
  v_prepared jsonb := '[]'::jsonb;
  v_row record;
  v_message_id uuid;
  v_item_id uuid;
  v_version integer;
  v_index integer;
  v_type text;
  v_amount numeric;
  v_extracted numeric;
  v_basis numeric;
  v_user_edited boolean;
  v_choice text;
  v_candidates jsonb;
  v_check_amount numeric;
  v_check_currency text;
  v_status text;
  v_duplicate_of uuid;
  v_result jsonb := '[]'::jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  v_key := nullif(p_payload->>'idempotency_key', '');
  v_items := p_payload->'items';
  IF v_key IS NULL OR jsonb_typeof(v_items) IS DISTINCT FROM 'array' THEN
    RAISE EXCEPTION 'DRAFT_NOT_READY';
  END IF;
  IF jsonb_array_length(v_items) = 0 THEN
    RAISE EXCEPTION 'DRAFT_NOT_READY';
  END IF;

  -- MAX_ITEMS_PER_MESSAGE 5
  IF jsonb_array_length(v_items) > 5 THEN
    RAISE EXCEPTION 'TOO_MANY_ITEMS';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(v_items)
  LOOP
    IF jsonb_typeof(v_item) IS DISTINCT FROM 'object' THEN
      RAISE EXCEPTION 'DRAFT_NOT_READY';
    END IF;

    v_draft := v_item;
    v_type := v_draft->>'type';
    v_amount := (v_draft->>'amount')::numeric;
    v_extracted := NULL;

    IF v_type IS NULL OR v_type NOT IN (
      'income', 'expense', 'donation', 'exempt-income',
      'recognized-expense', 'non_tithe_donation'
    ) OR v_amount IS NULL OR v_amount = 0
       OR nullif(v_draft->>'currency', '') IS NULL
       OR (v_draft->>'date') !~ '^\d{4}-\d{2}-\d{2}$' THEN
      RAISE EXCEPTION 'DRAFT_NOT_READY';
    END IF;

    IF (v_draft->>'extracted_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
      v_extracted := (v_draft->>'extracted_amount')::numeric;
    ELSIF nullif(upper(btrim(v_draft->>'original_currency')), '') IS NULL
      AND (v_draft->>'original_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
      v_extracted := (v_draft->>'original_amount')::numeric;
    END IF;

    v_basis := CASE
      WHEN nullif(upper(btrim(v_draft->>'original_currency')), '') IS NOT NULL
        AND (v_draft->>'original_amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
        THEN (v_draft->>'original_amount')::numeric
      ELSE v_amount
    END;

    IF v_extracted IS NULL THEN
      v_extracted := v_basis;
    END IF;

    v_user_edited :=
      lower(btrim(coalesce(v_draft->>'description', '')))
        IS DISTINCT FROM lower(btrim(coalesce(
          v_draft->>'original_description',
          v_draft->>'description',
          ''
        )))
      OR v_extracted IS DISTINCT FROM v_basis;

    v_choice := v_draft->>'duplicate_choice';
    IF v_choice IS DISTINCT FROM 'saved_anyway' AND v_choice IS DISTINCT FROM 'same_event' THEN
      v_choice := NULL;
    END IF;

    v_check_amount := v_basis;
    v_check_currency := coalesce(
      nullif(upper(btrim(v_draft->>'original_currency')), ''),
      upper(btrim(v_draft->>'currency'))
    );
    v_candidates := '[]'::jsonb;

    IF v_choice IS NOT NULL AND jsonb_typeof(v_draft->'duplicate_candidate_ids') = 'array' THEN
      SELECT coalesce(
        jsonb_agg(jsonb_build_object('id', found.id, 'kind', found.kind)),
        '[]'::jsonb
      )
      INTO v_candidates
      FROM (
        SELECT match.id, match.kind
        FROM ai.matching_duplicate_candidates(
          v_uid,
          v_type,
          (v_draft->>'date')::date,
          v_check_amount,
          v_check_currency
        ) AS match
        WHERE match.id IN (
          SELECT jsonb_array_elements_text(v_draft->'duplicate_candidate_ids')
        )
        LIMIT 20
      ) AS found;
    END IF;

    IF v_choice = 'same_event' AND v_candidates = '[]'::jsonb THEN
      RAISE EXCEPTION 'DRAFT_NOT_READY';
    END IF;

    IF v_candidates = '[]'::jsonb THEN
      v_choice := NULL;
    END IF;

    v_status := CASE WHEN v_choice = 'same_event' THEN 'rejected' ELSE 'ready' END;
    v_duplicate_of := CASE
      WHEN v_choice = 'same_event' AND v_candidates->0->>'kind' = 'transaction'
        THEN (v_candidates->0->>'id')::uuid
      ELSE NULL
    END;

    IF nullif(upper(btrim(v_draft->>'original_currency')), '') IS NULL THEN
      v_draft := v_draft
        - 'original_amount'
        - 'conversion_rate'
        - 'conversion_date'
        - 'rate_source';
    END IF;

    v_prepared := v_prepared || jsonb_build_array(jsonb_build_object(
      'payload', v_draft,
      'status', v_status,
      'duplicate_of', v_duplicate_of,
      'choice', v_choice,
      'candidates', v_candidates,
      'user_edited', v_user_edited
    ));
  END LOOP;

  INSERT INTO ai.intake_messages (
    user_id,
    channel,
    content_kind,
    idempotency_key,
    text_redacted,
    status,
    received_at,
    timezone
  ) VALUES (
    v_uid,
    'web',
    'text',
    v_key,
    left(coalesce(v_prepared->0->'payload'->>'description', ''), 500),
    'ready',
    now(),
    coalesce(nullif(p_payload->>'timezone', ''), 'Asia/Jerusalem')
  )
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_message_id;

  IF v_message_id IS NULL THEN
    SELECT coalesce(
      jsonb_agg(
        jsonb_build_object(
          'item_id', item.id,
          'version', item.version,
          'item_index', item.item_index
        )
        ORDER BY item.item_index
      ),
      '[]'::jsonb
    )
    INTO v_result
    FROM ai.intake_items item
    JOIN ai.intake_messages message ON message.id = item.message_id
    WHERE message.user_id = v_uid
      AND message.idempotency_key = v_key;

    IF v_result = '[]'::jsonb THEN
      RAISE EXCEPTION 'DRAFT_NOT_READY';
    END IF;

    RETURN v_result;
  END IF;

  FOR v_row IN
    SELECT value AS prepared, (ordinality - 1)::integer AS item_index
    FROM jsonb_array_elements(v_prepared) WITH ORDINALITY
  LOOP
    v_index := v_row.item_index;
    v_draft := v_row.prepared->'payload';
    v_status := v_row.prepared->>'status';
    v_choice := nullif(v_row.prepared->>'choice', '');
    v_candidates := coalesce(v_row.prepared->'candidates', '[]'::jsonb);
    v_duplicate_of := nullif(v_row.prepared->>'duplicate_of', '')::uuid;
    v_user_edited := coalesce((v_row.prepared->>'user_edited')::boolean, false);

    INSERT INTO ai.intake_items (
      message_id,
      user_id,
      item_index,
      status,
      normalized_payload,
      quality_signals,
      duplicate_of_transaction_id
    ) VALUES (
      v_message_id,
      v_uid,
      v_index,
      v_status,
      v_draft,
      jsonb_build_object(
        'shadow_auto_save', ai.shadow_auto_save(v_uid, v_draft),
        'user_edited', v_user_edited
      ) || CASE
        WHEN v_choice IS NULL THEN '{}'::jsonb
        ELSE jsonb_build_object(
          'duplicate_warning',
          jsonb_build_object('choice', v_choice, 'candidate_ids', v_candidates)
        )
      END,
      v_duplicate_of
    )
    RETURNING id, version INTO v_item_id, v_version;

    IF v_choice IS NOT NULL THEN
      INSERT INTO ai.intake_events (
        message_id,
        item_id,
        event_type,
        to_status,
        actor_type,
        actor_id,
        metadata
      ) VALUES (
        v_message_id,
        v_item_id,
        'duplicate_choice',
        v_status,
        'user',
        v_uid,
        jsonb_build_object('choice', v_choice, 'candidate_ids', v_candidates)
      );
    END IF;

    v_result := v_result || jsonb_build_array(jsonb_build_object(
      'item_id', v_item_id,
      'version', v_version,
      'item_index', v_index
    ));
  END LOOP;

  RETURN v_result;
END;
$_$;
CREATE FUNCTION ai.disable_user_rule(p_name text, p_type text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_name text := lower(btrim(coalesce(p_name, '')));
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_type NOT IN ('exempt-income', 'recognized-expense', 'non_tithe_donation') THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  UPDATE ai.user_rules
  SET status = 'disabled',
      version = version + 1,
      updated_at = now()
  WHERE user_id = v_uid
    AND status = 'active'
    AND match->>'name' = v_name
    AND action->>'type' = p_type
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RETURN jsonb_build_object('error', 'NOT_FOUND');
  END IF;

  RETURN jsonb_build_object('disabled', true);
END;
$$;
CREATE FUNCTION ai.list_expired_receipt_artifacts() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'storage_path', storage_path)), '[]'::jsonb)
    FROM (
      SELECT id, storage_path
      FROM ai.source_artifacts
      WHERE deleted_at IS NULL
        AND retention_mode = 'temporary'
        AND expires_at IS NOT NULL
        AND expires_at < now()
      ORDER BY expires_at
      LIMIT 200
    ) AS expired
  );
END;
$$;
CREATE FUNCTION ai.mark_receipt_artifacts_deleted(p_ids uuid[]) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  UPDATE ai.source_artifacts
  SET deleted_at = now()
  WHERE id = ANY (coalesce(p_ids, '{}'::uuid[]))
    AND deleted_at IS NULL
    AND retention_mode = 'temporary'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
CREATE FUNCTION ai.matching_duplicate_candidates(p_uid uuid, p_type text, p_date date, p_amount numeric, p_currency text) RETURNS TABLE(id text, candidate_date text, amount numeric, description text, kind text, distance integer)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $_$
  SELECT
    picked.id,
    picked.candidate_date,
    picked.amount,
    picked.description,
    picked.kind,
    picked.distance
  FROM (
    SELECT
      prior.id::text AS id,
      prior.date::text AS candidate_date,
      CASE
        WHEN upper(coalesce(prior.currency, '')) = upper(coalesce(p_currency, ''))
          THEN prior.amount
        ELSE prior.original_amount
      END AS amount,
      left(coalesce(prior.description, ''), 80) AS description,
      'transaction'::text AS kind,
      abs(prior.date - p_date) AS distance
    FROM public.transactions AS prior
    WHERE prior.user_id = p_uid
      AND prior.type = p_type
      AND prior.date BETWEEN p_date - 3 AND p_date + 3
      AND (
        (
          upper(coalesce(prior.currency, '')) = upper(coalesce(p_currency, ''))
          AND prior.amount BETWEEN least(p_amount * 0.98, p_amount * 1.02)
            AND greatest(p_amount * 0.98, p_amount * 1.02)
        )
        OR (
          prior.original_amount IS NOT NULL
          AND upper(coalesce(prior.original_currency, '')) = upper(coalesce(p_currency, ''))
          AND prior.original_amount = p_amount
        )
      )
    UNION ALL
    SELECT
      item.id::text,
      item.normalized_payload->>'date',
      CASE
        WHEN upper(coalesce(item.normalized_payload->>'currency', '')) = upper(coalesce(p_currency, ''))
          THEN (item.normalized_payload->>'amount')::numeric
        ELSE (item.normalized_payload->>'original_amount')::numeric
      END,
      left(coalesce(item.normalized_payload->>'description', ''), 80),
      'draft'::text,
      abs((item.normalized_payload->>'date')::date - p_date)
    FROM ai.intake_items AS item
    WHERE item.user_id = p_uid
      AND item.status IN ('ready', 'needs_review', 'approved')
      AND item.normalized_payload->>'type' = p_type
      AND (item.normalized_payload->>'date') ~ '^\d{4}-\d{2}-\d{2}$'
      AND (item.normalized_payload->>'date')::date BETWEEN p_date - 3 AND p_date + 3
      AND (
        (
          upper(coalesce(item.normalized_payload->>'currency', '')) = upper(coalesce(p_currency, ''))
          AND (item.normalized_payload->>'amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
          AND (item.normalized_payload->>'amount')::numeric BETWEEN least(p_amount * 0.98, p_amount * 1.02)
            AND greatest(p_amount * 0.98, p_amount * 1.02)
        )
        OR (
          (item.normalized_payload->>'original_amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
          AND upper(coalesce(item.normalized_payload->>'original_currency', '')) = upper(coalesce(p_currency, ''))
          AND (item.normalized_payload->>'original_amount')::numeric = p_amount
        )
      )
  ) AS picked
  WHERE p_uid IS NOT NULL
    AND p_amount IS NOT NULL
    AND p_amount <> 0;
$_$;
CREATE FUNCTION ai.question_totals(p_uid uuid, p_types text[], p_from date, p_to date, p_payment_method text, p_category text, p_description text, p_recipient text) RETURNS TABLE(total numeric, row_count bigint, max_amount numeric, currencies text[])
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT
    coalesce(sum(picked.amount), 0),
    count(*),
    coalesce(max(picked.amount), 0),
    coalesce(
      array_agg(DISTINCT picked.currency) FILTER (WHERE picked.currency <> ''),
      ARRAY[]::text[]
    )
  FROM (
    SELECT
      prior.amount,
      upper(coalesce(prior.currency, '')) AS currency
    FROM public.transactions AS prior
    WHERE p_uid IS NOT NULL
      AND prior.user_id = p_uid
      AND prior.type = ANY (p_types)
      AND prior.type IN (
        'income', 'expense', 'donation', 'exempt-income',
        'recognized-expense', 'non_tithe_donation'
      )
      AND prior.date BETWEEN p_from AND p_to
      AND (p_payment_method IS NULL OR prior.payment_method = p_payment_method)
      AND (
        p_category IS NULL
        OR lower(btrim(coalesce(prior.category, ''))) = lower(btrim(p_category))
      )
      AND (
        p_description IS NULL
        OR position(lower(p_description) IN lower(coalesce(prior.description, ''))) > 0
      )
      AND (
        p_recipient IS NULL
        OR translate(lower(btrim(coalesce(prior.recipient, ''))), '״"''׳', '')
          = translate(lower(btrim(p_recipient)), '״"''׳', '')
        OR (
          prior.type IN ('donation', 'non_tithe_donation')
          AND nullif(btrim(coalesce(prior.recipient, '')), '') IS NULL
          AND translate(lower(btrim(coalesce(prior.description, ''))), '״"''׳', '')
            = translate(lower(btrim(p_recipient)), '״"''׳', '')
        )
      )
  ) AS picked;
$$;
CREATE FUNCTION ai.receipt_artifact_id_for_path(p_user_id uuid, p_storage_path text) RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_id uuid;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_user_id IS NULL OR p_storage_path IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT id
  INTO v_id
  FROM ai.source_artifacts
  WHERE user_id = p_user_id
    AND storage_path = p_storage_path
    AND deleted_at IS NULL
  LIMIT 1;

  RETURN v_id;
END;
$$;
CREATE FUNCTION ai.receipt_artifact_path(p_user_id uuid, p_artifact_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_path text;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_user_id IS NULL OR p_artifact_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT storage_path
  INTO v_path
  FROM ai.source_artifacts
  WHERE id = p_artifact_id
    AND user_id = p_user_id
    AND deleted_at IS NULL
    AND storage_path LIKE p_user_id::text || '/%'
    AND storage_path NOT LIKE '%..%'
  LIMIT 1;

  RETURN v_path;
END;
$$;
CREATE FUNCTION ai.receipt_storage_path(p_user_id uuid, p_transaction_id uuid) RETURNS text
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_path text;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_user_id IS NULL OR p_transaction_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT artifact.storage_path
  INTO v_path
  FROM ai.transaction_source_links AS link
  JOIN ai.source_artifacts AS artifact ON artifact.id = link.source_artifact_id
  JOIN public.transactions AS saved ON saved.id = link.transaction_id
  WHERE link.transaction_id = p_transaction_id
    AND saved.user_id = p_user_id
    AND artifact.user_id = p_user_id
    AND artifact.deleted_at IS NULL
    AND artifact.storage_path LIKE p_user_id::text || '/%'
    AND artifact.storage_path NOT LIKE '%..%'
  LIMIT 1;

  RETURN v_path;
END;
$$;
CREATE FUNCTION ai.record_intake_outcome() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
BEGIN
  IF NEW.status = 'committed' AND OLD.status IS DISTINCT FROM 'committed' THEN
    NEW.quality_signals := coalesce(NEW.quality_signals, '{}'::jsonb)
      || jsonb_build_object('outcome', 'approved');
  ELSIF NEW.status = 'reverted' AND OLD.status IS DISTINCT FROM 'reverted' THEN
    NEW.quality_signals := coalesce(NEW.quality_signals, '{}'::jsonb)
      || jsonb_build_object('outcome', 'reverted');
  END IF;
  RETURN NEW;
END;
$$;
CREATE FUNCTION ai.record_model_call(p_user_id uuid, p_operation text, p_model text, p_ok boolean, p_http_status integer, p_error_code text, p_latency_ms integer, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric, p_generation_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
BEGIN
  INSERT INTO ai.model_calls (
    user_id, operation, model, ok, http_status, error_code, latency_ms,
    input_tokens, output_tokens, cost_usd, generation_id
  ) VALUES (
    p_user_id, p_operation, left(p_model, 100), p_ok, p_http_status, p_error_code, p_latency_ms,
    p_input_tokens, p_output_tokens, p_cost_usd, left(p_generation_id, 100)
  );
END;
$$;
CREATE FUNCTION ai.record_question_slot_confidence(p_user_id uuid, p_signals jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_field text;
  v_number numeric;
  v_slots jsonb := '{}'::jsonb;
  v_id uuid;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_signals IS NOT NULL AND jsonb_typeof(p_signals) = 'object' THEN
    FOREACH v_field IN ARRAY ARRAY['family', 'measure', 'recipient', 'category', 'payment_method']
    LOOP
      IF jsonb_typeof(p_signals->v_field) = 'number' THEN
        v_number := (p_signals->>v_field)::numeric;
        IF v_number >= 0 AND v_number <= 1 THEN
          v_slots := v_slots || jsonb_build_object(v_field, v_number);
        END IF;
      END IF;
    END LOOP;
  END IF;

  INSERT INTO ai.question_measurements (user_id, quality_signals)
  VALUES (p_user_id, jsonb_build_object('slot_confidence', v_slots))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
CREATE FUNCTION ai.record_receipt_artifact(p_user_id uuid, p_sha256 text, p_mime text, p_size bigint, p_storage_path text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $_$
DECLARE
  v_kind text;
  v_message_id uuid;
  v_existing text;
  v_key text;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'ARTIFACT_REJECTED';
  END IF;

  IF p_mime = 'application/pdf' THEN
    v_kind := 'pdf';
    IF p_size IS NULL OR p_size <= 0 OR p_size > 15728640 THEN
      RAISE EXCEPTION 'ARTIFACT_REJECTED';
    END IF;
  ELSIF p_mime IN ('image/jpeg', 'image/png', 'image/webp') THEN
    v_kind := 'image';
    IF p_size IS NULL OR p_size <= 0 OR p_size > 10485760 THEN
      RAISE EXCEPTION 'ARTIFACT_REJECTED';
    END IF;
  ELSE
    RAISE EXCEPTION 'ARTIFACT_REJECTED';
  END IF;

  IF p_storage_path !~ (
    '^' || p_user_id::text || '/[0-9]{4}/[0-9]{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'ARTIFACT_REJECTED';
  END IF;

  v_key := split_part(p_storage_path, '/', 4);

  SELECT storage_path
  INTO v_existing
  FROM ai.source_artifacts
  WHERE user_id = p_user_id
    AND sha256 = p_sha256
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('storage_path', v_existing, 'already_stored', true);
  END IF;

  BEGIN
    INSERT INTO ai.intake_messages (
      user_id,
      channel,
      content_kind,
      idempotency_key,
      status,
      received_at,
      expires_at
    ) VALUES (
      p_user_id,
      'web',
      v_kind,
      v_key,
      'received',
      now(),
      now() + interval '30 days'
    )
    RETURNING id INTO v_message_id;

    INSERT INTO ai.source_artifacts (
      user_id,
      intake_message_id,
      storage_bucket,
      storage_path,
      media_type,
      mime_type,
      file_size,
      sha256,
      retention_mode,
      expires_at
    ) VALUES (
      p_user_id,
      v_message_id,
      'intake-artifacts',
      p_storage_path,
      v_kind,
      p_mime,
      p_size,
      p_sha256,
      'temporary',
      now() + interval '30 days'
    );
  EXCEPTION
    WHEN unique_violation THEN
      SELECT storage_path
      INTO v_existing
      FROM ai.source_artifacts
      WHERE user_id = p_user_id
        AND sha256 = p_sha256
        AND deleted_at IS NULL
      LIMIT 1;

      IF v_existing IS NULL THEN
        RAISE EXCEPTION 'ARTIFACT_REJECTED';
      END IF;

      RETURN jsonb_build_object('storage_path', v_existing, 'already_stored', true);
  END;

  RETURN jsonb_build_object('storage_path', p_storage_path, 'already_stored', false);
END;
$_$;
CREATE FUNCTION ai.release_usage(p_usage_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_event ai.usage_events%ROWTYPE;
BEGIN
  -- ponytail: a charge both calls of a turn used is kept, so one failed call cannot hand the other a free answer.
  -- When both fail the message still costs its unit; count the failures per turn if that ever matters.
  UPDATE ai.usage_events SET released_at = now()
  WHERE id = p_usage_id AND released_at IS NULL AND coalesce(cardinality(ops), 0) < 2
  RETURNING * INTO v_event;
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  UPDATE ai.usage_counters
  SET units_used = greatest(units_used - v_event.units, 0)
  WHERE user_id = v_event.user_id AND period_start = v_event.period_start;
  RETURN true;
END;
$$;
CREATE FUNCTION ai.shadow_auto_save(p_uid uuid, p_payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $_$
DECLARE
  v_type text := p_payload->>'type';
  v_currency text := upper(coalesce(p_payload->>'currency', ''));
  v_original text := nullif(upper(coalesce(p_payload->>'original_currency', '')), '');
  v_default text;
  v_amount numeric := (p_payload->>'amount')::numeric;
  v_date date := (p_payload->>'date')::date;
  v_description text := lower(btrim(coalesce(p_payload->>'description', '')));
  v_category text := coalesce(lower(nullif(p_payload->>'category', '')), '');
  v_expense boolean;
  v_same_currency boolean;
  v_explicit boolean;
  v_known boolean;
  v_duplicate boolean;
  v_blocked jsonb := '[]'::jsonb;
BEGIN
  SELECT upper(coalesce(default_currency, ''))
  INTO v_default
  FROM public.profiles
  WHERE id = p_uid;

  v_expense := v_type = 'expense';
  v_same_currency := v_currency <> ''
    AND v_currency = v_default
    AND (v_original IS NULL OR v_original = v_currency);
  v_explicit := v_amount IS NOT NULL
    AND v_amount <> 0
    AND (p_payload->>'date') ~ '^\d{4}-\d{2}-\d{2}$';
  v_known := char_length(v_description) >= 2 AND (
    EXISTS (
      SELECT 1
      FROM public.transactions AS prior
      WHERE prior.user_id = p_uid
        AND prior.type = 'expense'
        AND lower(btrim(coalesce(prior.description, ''))) = v_description
        AND coalesce(lower(prior.category), '') = v_category
    )
    OR EXISTS (
      SELECT 1
      FROM ai.user_rules AS rule
      WHERE rule.user_id = p_uid
        AND rule.status = 'active'
        AND char_length(coalesce(rule.match->>'name', '')) >= 2
        AND strpos(v_description, rule.match->>'name') > 0
    )
  );
  v_duplicate := v_amount IS NOT NULL AND EXISTS (
    SELECT 1
    FROM ai.matching_duplicate_candidates(p_uid, v_type, v_date, v_amount, v_currency)
  );

  IF NOT v_expense THEN
    v_blocked := v_blocked || jsonb_build_array('NOT_EXPENSE');
  END IF;
  IF NOT v_same_currency THEN
    v_blocked := v_blocked || jsonb_build_array('CURRENCY');
  END IF;
  IF NOT v_explicit THEN
    v_blocked := v_blocked || jsonb_build_array('NOT_EXPLICIT');
  END IF;
  IF NOT v_known THEN
    v_blocked := v_blocked || jsonb_build_array('UNKNOWN_MERCHANT');
  END IF;
  IF v_duplicate THEN
    v_blocked := v_blocked || jsonb_build_array('DUPLICATE_CANDIDATE');
  END IF;
  v_blocked := v_blocked || jsonb_build_array('DECIDE_UNAVAILABLE');

  RETURN jsonb_build_object(
    'eligible_without_model', v_blocked = jsonb_build_array('DECIDE_UNAVAILABLE'),
    'would_auto_save', false,
    'blocked_by', v_blocked
  );
END;
$_$;
CREATE FUNCTION ai.take_call(p_user_id uuid) RETURNS text
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_day timestamptz := date_trunc('day', now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_minute timestamptz := date_trunc('minute', now());
  v_calls integer;
BEGIN
  INSERT INTO ai.usage_rate AS rate (user_id, bucket, bucket_start, calls)
  VALUES (p_user_id, 'day', v_day, 1)
  ON CONFLICT (user_id, bucket, bucket_start)
  DO UPDATE SET calls = rate.calls + 1 WHERE rate.calls < 300
  RETURNING calls INTO v_calls;
  IF v_calls IS NULL THEN
    RETURN 'daily_limit';
  END IF;

  v_calls := NULL;
  INSERT INTO ai.usage_rate AS rate (user_id, bucket, bucket_start, calls)
  VALUES (p_user_id, 'minute', v_minute, 1)
  ON CONFLICT (user_id, bucket, bucket_start)
  DO UPDATE SET calls = rate.calls + 1 WHERE rate.calls < 30
  RETURNING calls INTO v_calls;
  IF v_calls IS NULL THEN
    UPDATE ai.usage_rate SET calls = calls - 1
    WHERE user_id = p_user_id AND bucket = 'day' AND bucket_start = v_day;
    RETURN 'rate_limited';
  END IF;
  RETURN NULL;
END;
$$;
CREATE FUNCTION ai.undo_intake_commit(p_item_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item ai.intake_items%ROWTYPE;
  v_tx public.transactions%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT *
  INTO v_item
  FROM ai.intake_items
  WHERE id = p_item_id
    AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'UNDO_NOT_ALLOWED');
  END IF;

  IF v_item.status = 'reverted' THEN
    RETURN jsonb_build_object('alreadyReverted', true);
  END IF;

  IF v_item.status <> 'committed' OR v_item.committed_transaction_id IS NULL THEN
    RETURN jsonb_build_object('error', 'UNDO_NOT_ALLOWED');
  END IF;

  SELECT *
  INTO v_tx
  FROM public.transactions
  WHERE id = v_item.committed_transaction_id
    AND user_id = v_uid
  FOR UPDATE;

  IF NOT FOUND
     OR v_tx.origin NOT IN ('ai', 'ai_auto')
     OR v_tx.updated_at IS DISTINCT FROM v_tx.created_at
     OR v_tx.created_at < now() - interval '7 days' THEN
    RETURN jsonb_build_object('error', 'UNDO_NOT_ALLOWED');
  END IF;

  DELETE FROM public.transactions
  WHERE id = v_tx.id;

  UPDATE ai.intake_items
  SET status = 'reverted',
      committed_transaction_id = NULL,
      version = version + 1,
      updated_at = now()
  WHERE id = v_item.id;

  INSERT INTO ai.intake_events (
    message_id,
    item_id,
    event_type,
    from_status,
    to_status,
    actor_type,
    actor_id
  ) VALUES (
    v_item.message_id,
    v_item.id,
    'reverted',
    'committed',
    'reverted',
    'user',
    v_uid
  );

  RETURN jsonb_build_object('reverted', true);
END;
$$;
CREATE FUNCTION ai.usage_quota(p_user_id uuid) RETURNS integer
    LANGUAGE sql STABLE
    AS $$
  SELECT 1000;
$$;
CREATE FUNCTION ai.usage_weight(p_kind text) RETURNS integer
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT CASE p_kind WHEN 'receipt' THEN 5 WHEN 'speech' THEN 3 WHEN 'text' THEN 1 END;
$$;
CREATE FUNCTION public.ai_question_totals(p_types text[], p_from date, p_to date, p_payment_method text, p_category text, p_description text, p_recipient text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT jsonb_build_object(
    'total', found.total,
    'count', found.row_count,
    'max_amount', found.max_amount,
    'currencies', to_jsonb(found.currencies)
  )
  FROM ai.question_totals(
    auth.uid(),
    coalesce(p_types, ARRAY[]::text[]),
    p_from,
    p_to,
    nullif(btrim(p_payment_method), ''),
    nullif(btrim(p_category), ''),
    nullif(btrim(p_description), ''),
    nullif(btrim(p_recipient), '')
  ) AS found;
$$;
CREATE FUNCTION public.approve_ai_user_rule(p_name text, p_type text, p_effective_from date) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.approve_user_rule(p_name, p_type, p_effective_from);
$$;
CREATE FUNCTION public.attach_ai_receipt_artifact(p_item_id uuid, p_artifact_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.attach_receipt_artifact(p_item_id, p_artifact_id);
$$;
CREATE FUNCTION public.commit_ai_intake_items(p_items jsonb) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.commit_intake_items(p_items);
$$;
CREATE FUNCTION public.consume_ai_call(p_user_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN ai.consume_call(p_user_id);
END;
$$;
CREATE FUNCTION public.consume_ai_usage(p_user_id uuid, p_kind text, p_turn uuid DEFAULT NULL, p_op text DEFAULT NULL) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN ai.consume_usage(p_user_id, p_kind, p_turn, p_op);
END;
$$;
CREATE FUNCTION public.create_ai_text_intake(p_payload jsonb) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $_$
DECLARE
  v_result jsonb;
  v_confidence numeric;
BEGIN
  v_result := ai.create_text_intake(p_payload - 'intent_confidence');
  IF (p_payload->>'intent_confidence') ~ '^(0(\.[0-9]+)?|1(\.0+)?)$' THEN
    v_confidence := (p_payload->>'intent_confidence')::numeric;
    UPDATE ai.intake_items
    SET quality_signals = coalesce(quality_signals, '{}'::jsonb)
      || jsonb_build_object('intent_confidence', v_confidence)
    WHERE id = (v_result->>'item_id')::uuid
      AND user_id = auth.uid();
  END IF;
  RETURN v_result;
END;
$_$;
CREATE FUNCTION public.create_ai_text_intake_items(p_payload jsonb) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.create_text_intake_items(p_payload);
$$;
CREATE FUNCTION public.disable_ai_user_rule(p_name text, p_type text) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.disable_user_rule(p_name, p_type);
$$;
CREATE FUNCTION public.dismiss_ai_duplicate_pair(p_a uuid, p_b uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_low uuid;
  v_high uuid;
BEGIN
  IF v_uid IS NULL OR p_a IS NULL OR p_b IS NULL OR p_a = p_b THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  IF p_a < p_b THEN
    v_low := p_a;
    v_high := p_b;
  ELSE
    v_low := p_b;
    v_high := p_a;
  END IF;
  IF (
    SELECT count(*)
    FROM public.transactions
    WHERE user_id = v_uid
      AND id IN (v_low, v_high)
  ) <> 2 THEN
    RAISE EXCEPTION 'NOT_FOUND';
  END IF;
  INSERT INTO ai.duplicate_dismissals (user_id, transaction_a, transaction_b)
  VALUES (v_uid, v_low, v_high)
  ON CONFLICT (user_id, transaction_a, transaction_b) DO NOTHING;
END;
$$;
CREATE FUNCTION public.get_admin_ai_calls(p_from date, p_to date) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
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
$$;
CREATE FUNCTION public.get_admin_ai_stats(p_from date, p_to date) RETURNS json
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
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
    'usage', json_build_object(
      'ai_transactions', (
        SELECT COUNT(*) FROM public.transactions
        WHERE origin IN ('ai', 'ai_auto') AND date BETWEEN p_from AND p_to
      ),
      'ai_auto_transactions', (
        SELECT COUNT(*) FROM public.transactions
        WHERE origin = 'ai_auto' AND date BETWEEN p_from AND p_to
      ),
      'all_transactions', (
        SELECT COUNT(*) FROM public.transactions
        WHERE date BETWEEN p_from AND p_to
      ),
      'ai_transaction_users', (
        SELECT COUNT(DISTINCT user_id) FROM public.transactions
        WHERE origin IN ('ai', 'ai_auto') AND date BETWEEN p_from AND p_to
      ),
      'ai_users', (
        SELECT COUNT(*) FROM (
          SELECT user_id FROM public.transactions
          WHERE origin IN ('ai', 'ai_auto') AND date BETWEEN p_from AND p_to
          UNION
          SELECT user_id FROM ai.intake_messages
          WHERE created_at >= v_start AND created_at < v_end
          UNION
          SELECT user_id FROM ai.question_measurements
          WHERE created_at >= v_start AND created_at < v_end
          UNION
          SELECT user_id FROM public.recurring_transactions
          WHERE origin = 'ai' AND created_at >= v_start AND created_at < v_end
        ) people
      ),
      'message_senders', (
        SELECT COUNT(DISTINCT user_id)
        FROM ai.intake_messages
        WHERE created_at >= v_start AND created_at < v_end
      ),
      'ai_recurring', (
        SELECT COUNT(*) FROM public.recurring_transactions
        WHERE origin = 'ai'
          AND created_at >= v_start AND created_at < v_end
      )
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
$$;
CREATE FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[], p_payment_methods text[], p_origin text DEFAULT NULL::text) RETURNS TABLE(transactions jsonb, total_count bigint)
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
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
            END,
            'receipt_expires_at',
            (
              SELECT artifact.expires_at
              FROM ai.transaction_source_links AS link
              JOIN ai.source_artifacts AS artifact
                ON artifact.id = link.source_artifact_id
              WHERE link.transaction_id = p.id
                AND artifact.deleted_at IS NULL
              ORDER BY artifact.expires_at DESC NULLS LAST
              LIMIT 1
            )
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
$_$;
CREATE FUNCTION public.list_ai_duplicate_candidates(p_type text, p_date date, p_amount numeric, p_currency text) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', found.id,
      'date', found.candidate_date,
      'amount', found.amount,
      'description', found.description,
      'kind', found.kind
    )
    ORDER BY found.distance, found.candidate_date DESC
  ), '[]'::jsonb)
  FROM (
    SELECT id, candidate_date, amount, description, kind, distance
    FROM ai.matching_duplicate_candidates(auth.uid(), p_type, p_date, p_amount, p_currency)
    ORDER BY distance, candidate_date DESC
    LIMIT 20
  ) AS found;
$$;
CREATE FUNCTION public.list_ai_reader_rules(p_user_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'name', match->>'name',
    'type', action->>'type'
  )), '[]'::jsonb)
  FROM ai.user_rules
  WHERE user_id = p_user_id
    AND status = 'active';
$$;
CREATE FUNCTION public.list_ai_recipients() RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT coalesce(array_agg(DISTINCT btrim(recipient) ORDER BY btrim(recipient)), ARRAY[]::text[])
  FROM public.transactions
  WHERE user_id = auth.uid()
    AND recipient IS NOT NULL
    AND btrim(recipient) <> '';
$$;
CREATE FUNCTION public.list_ai_saved_duplicate_pairs() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  WITH pairs AS (
    SELECT
      a.id::text AS left_id,
      a.date::text AS left_date,
      a.amount AS left_amount,
      coalesce(a.currency, '') AS left_currency,
      left(coalesce(a.description, ''), 80) AS left_description,
      b.id::text AS right_id,
      b.date::text AS right_date,
      b.amount AS right_amount,
      coalesce(b.currency, '') AS right_currency,
      left(coalesce(b.description, ''), 80) AS right_description,
      greatest(a.date, b.date) AS later_date
    FROM public.transactions AS a
    JOIN public.transactions AS b
      ON b.user_id = a.user_id
     AND b.id > a.id
     AND b.type = a.type
     AND upper(coalesce(b.currency, '')) = upper(coalesce(a.currency, ''))
     AND b.date BETWEEN a.date - 3 AND a.date + 3
    WHERE a.user_id = auth.uid()
      AND a.amount IS NOT NULL
      AND a.amount <> 0
      AND b.amount BETWEEN least(a.amount * 0.98, a.amount * 1.02)
        AND greatest(a.amount * 0.98, a.amount * 1.02)
      AND NOT EXISTS (
        SELECT 1
        FROM ai.duplicate_dismissals AS dismissed
        WHERE dismissed.user_id = a.user_id
          AND dismissed.transaction_a = a.id
          AND dismissed.transaction_b = b.id
      )
  )
  SELECT jsonb_build_object(
    'count', (SELECT count(*) FROM pairs),
    'pairs', coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'left', jsonb_build_object(
            'id', row.left_id,
            'date', row.left_date,
            'amount', row.left_amount,
            'currency', row.left_currency,
            'type', '',
            'description', row.left_description
          ),
          'right', jsonb_build_object(
            'id', row.right_id,
            'date', row.right_date,
            'amount', row.right_amount,
            'currency', row.right_currency,
            'type', '',
            'description', row.right_description
          )
        )
        ORDER BY row.later_date DESC, row.left_id, row.right_id
      )
      FROM (
        SELECT *
        FROM pairs
        ORDER BY later_date DESC, left_id, right_id
        LIMIT 5
      ) AS row
    ), '[]'::jsonb)
  );
$$;
CREATE FUNCTION public.list_ai_user_rules() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'name', match->>'name',
    'type', action->>'type'
  )), '[]'::jsonb)
  FROM ai.user_rules
  WHERE user_id = auth.uid()
    AND status = 'active';
$$;
CREATE FUNCTION public.list_expired_receipt_artifacts() RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.list_expired_receipt_artifacts();
$$;
CREATE FUNCTION public.mark_ai_question_outcome(p_measurement_id uuid, p_outcome text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN;
  END IF;
  IF p_outcome NOT IN ('asked_family', 'searched_description', 'asked_again', 'answered') THEN
    RETURN;
  END IF;
  UPDATE ai.question_measurements
  SET quality_signals = quality_signals || jsonb_build_object('outcome', p_outcome)
  WHERE id = p_measurement_id
    AND user_id = auth.uid()
    AND NOT (quality_signals ? 'outcome');
END;
$$;
CREATE FUNCTION public.mark_receipt_artifacts_deleted(p_ids uuid[]) RETURNS integer
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.mark_receipt_artifacts_deleted(p_ids);
$$;
CREATE FUNCTION public.read_ai_shadow_type_context(p_item_id uuid) RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $_$
  SELECT jsonb_build_object(
    'description', left(coalesce(item.normalized_payload->>'description', ''), 200),
    'amount', CASE
      WHEN (item.normalized_payload->>'original_amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
        THEN (item.normalized_payload->>'original_amount')::numeric
      ELSE (item.normalized_payload->>'amount')::numeric
    END,
    'currency', coalesce(
      nullif(upper(btrim(item.normalized_payload->>'original_currency')), ''),
      upper(btrim(item.normalized_payload->>'currency'))
    ),
    'date', item.normalized_payload->>'date',
    'type', item.normalized_payload->>'type',
    'category', nullif(btrim(item.normalized_payload->>'category'), '')
  )
  FROM ai.intake_items AS item
  WHERE item.id = p_item_id
    AND item.user_id = auth.uid();
$_$;
CREATE FUNCTION public.receipt_artifact_id_for_path(p_user_id uuid, p_storage_path text) RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.receipt_artifact_id_for_path(p_user_id, p_storage_path);
$$;
CREATE FUNCTION public.receipt_artifact_path(p_user_id uuid, p_artifact_id uuid) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.receipt_artifact_path(p_user_id, p_artifact_id);
$$;
CREATE FUNCTION public.receipt_storage_path(p_user_id uuid, p_transaction_id uuid) RETURNS text
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.receipt_storage_path(p_user_id, p_transaction_id);
$$;
CREATE FUNCTION public.record_ai_model_call(p_user_id uuid, p_operation text, p_model text, p_ok boolean, p_http_status integer, p_error_code text, p_latency_ms integer, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric, p_generation_id text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  PERFORM ai.record_model_call(
    p_user_id, p_operation, p_model, p_ok, p_http_status, p_error_code, p_latency_ms,
    p_input_tokens, p_output_tokens, p_cost_usd, p_generation_id
  );
END;
$$;
CREATE FUNCTION public.record_ai_receipt_artifact(p_user_id uuid, p_sha256 text, p_mime text, p_size bigint, p_storage_path text) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.record_receipt_artifact(p_user_id, p_sha256, p_mime, p_size, p_storage_path);
$$;
CREATE FUNCTION public.record_ai_shadow_category(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_confidence numeric := p_confidence;
  v_base text;
  v_saved text;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_choice IS NULL OR char_length(btrim(p_choice)) = 0 OR char_length(p_choice) > 80 THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;
  IF v_confidence IS NOT NULL AND (v_confidence < 0 OR v_confidence > 1) THEN
    v_confidence := NULL;
  END IF;

  SELECT CASE item.normalized_payload->>'type'
    WHEN 'expense' THEN 'expense'
    WHEN 'recognized-expense' THEN 'expense'
    WHEN 'income' THEN 'income'
    WHEN 'exempt-income' THEN 'income'
    ELSE NULL
  END,
  nullif(btrim(item.normalized_payload->>'category'), '')
  INTO v_base, v_saved
  FROM ai.intake_items AS item
  WHERE item.id = p_item_id
    AND item.user_id = p_user_id;

  IF v_base IS NULL THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;

  IF NOT (
    (v_base = 'expense' AND p_choice IN (
      'food', 'transportation', 'housing', 'utilities', 'healthcare',
      'education', 'leisure', 'shopping', 'other'
    ))
    OR (v_base = 'income' AND p_choice IN (
      'salary', 'business', 'freelance', 'investment', 'allowance', 'gift', 'other'
    ))
    OR EXISTS (
      SELECT 1
      FROM public.transactions AS prior
      WHERE prior.user_id = p_user_id
        AND prior.type = v_base
        AND prior.category = p_choice
    )
  ) THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;

  UPDATE ai.intake_items
  SET quality_signals = coalesce(quality_signals, '{}'::jsonb) || jsonb_build_object(
    'shadow_category', jsonb_build_object(
      'choice', p_choice,
      'confidence', v_confidence,
      'matched_saved_category', CASE
        WHEN v_saved IS NULL THEN NULL
        ELSE v_saved IS NOT DISTINCT FROM p_choice
      END
    )
  )
  WHERE id = p_item_id
    AND user_id = p_user_id;

  RETURN jsonb_build_object('recorded', true);
END;
$$;
CREATE FUNCTION public.record_ai_shadow_type(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_confidence numeric := p_confidence;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF p_choice NOT IN (
    'income', 'expense', 'donation', 'exempt-income',
    'recognized-expense', 'non_tithe_donation'
  ) THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;
  IF v_confidence IS NOT NULL AND (v_confidence < 0 OR v_confidence > 1) THEN
    v_confidence := NULL;
  END IF;

  UPDATE ai.intake_items
  SET quality_signals = coalesce(quality_signals, '{}'::jsonb) || jsonb_build_object(
    'shadow_type', jsonb_build_object(
      'choice', p_choice,
      'confidence', v_confidence,
      'matched_user_type', (normalized_payload->>'type') IS NOT DISTINCT FROM p_choice
    )
  )
  WHERE id = p_item_id
    AND user_id = p_user_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('recorded', false);
  END IF;
  RETURN jsonb_build_object('recorded', true);
END;
$$;
CREATE FUNCTION public.record_ai_slot_confidence(p_user_id uuid, p_signals jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN ai.record_question_slot_confidence(p_user_id, p_signals);
END;
$$;
CREATE FUNCTION public.reject_uncommitted_ai_item(p_item_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  UPDATE ai.intake_items
  SET status = 'rejected'
  WHERE id = p_item_id
    AND user_id = v_uid
    AND status = 'ready';

  RETURN jsonb_build_object('rejected', FOUND);
END;
$$;
CREATE FUNCTION public.release_ai_usage(p_usage_id uuid) RETURNS boolean
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_usage_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN ai.release_usage(p_usage_id);
END;
$$;
CREATE FUNCTION public.undo_ai_intake_commit(p_item_id uuid) RETURNS jsonb
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
  SELECT ai.undo_intake_commit(p_item_id);
$$;
CREATE FUNCTION public.undo_ai_transaction(p_transaction_id uuid) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog', 'public', 'ai'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_item_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  SELECT id
  INTO v_item_id
  FROM ai.intake_items
  WHERE committed_transaction_id = p_transaction_id
    AND user_id = v_uid
    AND status = 'committed';

  IF v_item_id IS NULL THEN
    RETURN jsonb_build_object('error', 'UNDO_NOT_ALLOWED');
  END IF;

  RETURN ai.undo_intake_commit(v_item_id);
END;
$$;

-- ---------------------------------------------------------------------------
-- tables
-- ---------------------------------------------------------------------------
CREATE TABLE ai.duplicate_dismissals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    transaction_a uuid NOT NULL,
    transaction_b uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT duplicate_dismissals_check CHECK ((transaction_a < transaction_b))
);
CREATE TABLE ai.duplicate_scans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    status text DEFAULT 'queued'::text NOT NULL,
    requested_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    result jsonb,
    expires_at timestamp with time zone
);
CREATE TABLE ai.intake_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid,
    item_id uuid,
    event_type text NOT NULL,
    from_status text,
    to_status text,
    actor_type text NOT NULL,
    actor_id uuid,
    trace_id text,
    metadata jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE ai.intake_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    message_id uuid NOT NULL,
    user_id uuid NOT NULL,
    item_index integer NOT NULL,
    status text DEFAULT 'ready'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    draft_schema_version integer DEFAULT 1 NOT NULL,
    normalized_payload jsonb NOT NULL,
    quality_signals jsonb,
    evidence jsonb,
    validation_errors text[] DEFAULT '{}'::text[] NOT NULL,
    duplicate_of_transaction_id uuid,
    prompt_version text,
    model_route text,
    committed_transaction_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT intake_items_item_index_check CHECK ((item_index >= 0)),
    CONSTRAINT intake_items_status_check CHECK ((status = ANY (ARRAY['ready'::text, 'needs_review'::text, 'approved'::text, 'rejected'::text, 'committed'::text, 'reverted'::text])))
);
CREATE TABLE ai.intake_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    schema_version integer DEFAULT 1 NOT NULL,
    channel text NOT NULL,
    content_kind text NOT NULL,
    external_message_id text,
    idempotency_key text NOT NULL,
    text_redacted text,
    status text DEFAULT 'received'::text NOT NULL,
    attempt_count integer DEFAULT 0 NOT NULL,
    error_code text,
    received_at timestamp with time zone NOT NULL,
    processed_at timestamp with time zone,
    expires_at timestamp with time zone,
    timezone text DEFAULT 'Asia/Jerusalem'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT intake_messages_channel_check CHECK ((channel = ANY (ARRAY['web'::text, 'email'::text, 'whatsapp'::text]))),
    CONSTRAINT intake_messages_content_kind_check CHECK ((content_kind = ANY (ARRAY['text'::text, 'image'::text, 'pdf'::text, 'audio'::text, 'mixed'::text]))),
    CONSTRAINT intake_messages_status_check CHECK ((status = ANY (ARRAY['received'::text, 'queued'::text, 'processing'::text, 'ready'::text, 'needs_clarification'::text, 'failed'::text, 'committed'::text, 'reverted'::text, 'cancelled'::text, 'expired'::text])))
);
CREATE TABLE ai.model_calls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    operation text NOT NULL,
    model text NOT NULL,
    ok boolean NOT NULL,
    http_status integer,
    error_code text,
    latency_ms integer NOT NULL,
    input_tokens integer,
    output_tokens integer,
    cost_usd numeric(14,9),
    generation_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT model_calls_check CHECK ((ok = (error_code IS NULL))),
    CONSTRAINT model_calls_cost_usd_check CHECK ((cost_usd >= (0)::numeric)),
    CONSTRAINT model_calls_error_code_check CHECK ((error_code = ANY (ARRAY['timeout'::text, 'network'::text, 'http_4xx'::text, 'http_5xx'::text, 'unreadable'::text]))),
    CONSTRAINT model_calls_input_tokens_check CHECK ((input_tokens >= 0)),
    CONSTRAINT model_calls_latency_ms_check CHECK ((latency_ms >= 0)),
    CONSTRAINT model_calls_operation_check CHECK ((operation = ANY (ARRAY['intent'::text, 'question_slots'::text, 'question_period'::text, 'receipt'::text, 'speech'::text, 'duplicates'::text, 'shadow'::text, 'split'::text]))),
    CONSTRAINT model_calls_output_tokens_check CHECK ((output_tokens >= 0))
);
CREATE TABLE ai.question_measurements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    quality_signals jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE ai.source_artifacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    intake_message_id uuid NOT NULL,
    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    media_type text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    sha256 text NOT NULL,
    page_count integer,
    duration_ms integer,
    retention_mode text DEFAULT 'temporary'::text NOT NULL,
    expires_at timestamp with time zone,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT source_artifacts_file_size_check CHECK ((file_size >= 0)),
    CONSTRAINT source_artifacts_retention_mode_check CHECK ((retention_mode = ANY (ARRAY['temporary'::text, 'keep_receipt'::text])))
);
CREATE TABLE ai.transaction_source_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    transaction_id uuid NOT NULL,
    source_artifact_id uuid,
    intake_item_id uuid NOT NULL,
    item_index integer,
    page_number integer,
    confidence numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE ai.usage_counters (
    user_id uuid NOT NULL,
    period_start date NOT NULL,
    units_used integer NOT NULL,
    CONSTRAINT usage_counters_units_used_check CHECK ((units_used >= 0))
);
CREATE TABLE ai.usage_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    kind text NOT NULL,
    units integer NOT NULL,
    period_start date NOT NULL,
    released_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    turn_id uuid,
    ops text[],
    CONSTRAINT usage_events_kind_check CHECK ((kind = ANY (ARRAY['text'::text, 'receipt'::text, 'speech'::text]))),
    CONSTRAINT usage_events_units_check CHECK ((units > 0))
);
CREATE TABLE ai.usage_rate (
    user_id uuid NOT NULL,
    bucket text NOT NULL,
    bucket_start timestamp with time zone NOT NULL,
    calls integer NOT NULL,
    CONSTRAINT usage_rate_bucket_check CHECK ((bucket = ANY (ARRAY['minute'::text, 'day'::text]))),
    CONSTRAINT usage_rate_calls_check CHECK ((calls >= 0))
);
CREATE TABLE ai.user_rules (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    match jsonb NOT NULL,
    action jsonb NOT NULL,
    effective_from date,
    status text DEFAULT 'draft'::text NOT NULL,
    version integer DEFAULT 1 NOT NULL,
    created_via text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_rules_created_via_check CHECK ((created_via = ANY (ARRAY['assistant'::text, 'settings'::text]))),
    CONSTRAINT user_rules_status_check CHECK ((status = ANY (ARRAY['draft'::text, 'active'::text, 'disabled'::text])))
);

-- ---------------------------------------------------------------------------
-- comments
-- ---------------------------------------------------------------------------
COMMENT ON COLUMN public.recurring_transactions.origin IS 'ai when the assistant created the standing order. NULL for the form and for cron charges.';

-- ---------------------------------------------------------------------------
-- constraints
-- ---------------------------------------------------------------------------
ALTER TABLE ONLY ai.duplicate_dismissals
    ADD CONSTRAINT duplicate_dismissals_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.duplicate_dismissals
    ADD CONSTRAINT duplicate_dismissals_user_id_transaction_a_transaction_b_key UNIQUE (user_id, transaction_a, transaction_b);
ALTER TABLE ONLY ai.duplicate_scans
    ADD CONSTRAINT duplicate_scans_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.intake_events
    ADD CONSTRAINT intake_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.intake_items
    ADD CONSTRAINT intake_items_committed_transaction_id_key UNIQUE (committed_transaction_id);
ALTER TABLE ONLY ai.intake_items
    ADD CONSTRAINT intake_items_message_id_item_index_key UNIQUE (message_id, item_index);
ALTER TABLE ONLY ai.intake_items
    ADD CONSTRAINT intake_items_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.intake_messages
    ADD CONSTRAINT intake_messages_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.intake_messages
    ADD CONSTRAINT intake_messages_user_id_idempotency_key_key UNIQUE (user_id, idempotency_key);
ALTER TABLE ONLY ai.model_calls
    ADD CONSTRAINT model_calls_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.question_measurements
    ADD CONSTRAINT question_measurements_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.source_artifacts
    ADD CONSTRAINT source_artifacts_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.transaction_source_links
    ADD CONSTRAINT transaction_source_links_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.usage_counters
    ADD CONSTRAINT usage_counters_pkey PRIMARY KEY (user_id, period_start);
ALTER TABLE ONLY ai.usage_events
    ADD CONSTRAINT usage_events_pkey PRIMARY KEY (id);
ALTER TABLE ONLY ai.usage_rate
    ADD CONSTRAINT usage_rate_pkey PRIMARY KEY (user_id, bucket, bucket_start);
ALTER TABLE ONLY ai.user_rules
    ADD CONSTRAINT user_rules_pkey PRIMARY KEY (id);

-- ---------------------------------------------------------------------------
-- indexs
-- ---------------------------------------------------------------------------
CREATE INDEX duplicate_scans_user_requested_idx ON ai.duplicate_scans USING btree (user_id, requested_at DESC);
CREATE INDEX intake_events_message_idx ON ai.intake_events USING btree (message_id, created_at);
CREATE INDEX intake_items_user_status_created_idx ON ai.intake_items USING btree (user_id, status, created_at DESC);
CREATE INDEX intake_messages_active_status_idx ON ai.intake_messages USING btree (status) WHERE (status = ANY (ARRAY['queued'::text, 'processing'::text, 'needs_clarification'::text]));
CREATE UNIQUE INDEX intake_messages_channel_external_id_key ON ai.intake_messages USING btree (channel, external_message_id) WHERE (external_message_id IS NOT NULL);
CREATE INDEX intake_messages_user_received_idx ON ai.intake_messages USING btree (user_id, received_at DESC);
CREATE INDEX model_calls_created_at_idx ON ai.model_calls USING btree (created_at);
CREATE INDEX model_calls_user_created_idx ON ai.model_calls USING btree (user_id, created_at);
CREATE UNIQUE INDEX source_artifacts_active_sha256_idx ON ai.source_artifacts USING btree (user_id, sha256) WHERE (deleted_at IS NULL);
CREATE INDEX source_artifacts_message_idx ON ai.source_artifacts USING btree (intake_message_id);
CREATE INDEX source_artifacts_user_expires_idx ON ai.source_artifacts USING btree (user_id, expires_at);
CREATE INDEX transaction_source_links_item_idx ON ai.transaction_source_links USING btree (intake_item_id);
CREATE INDEX transaction_source_links_transaction_idx ON ai.transaction_source_links USING btree (transaction_id);
CREATE INDEX usage_events_created_at_idx ON ai.usage_events USING btree (created_at);
CREATE INDEX usage_events_user_id_idx ON ai.usage_events USING btree (user_id);
CREATE UNIQUE INDEX usage_events_turn_idx ON ai.usage_events USING btree (user_id, turn_id) WHERE (turn_id IS NOT NULL);
CREATE INDEX user_rules_user_status_idx ON ai.user_rules USING btree (user_id, status);
CREATE INDEX transactions_ai_origin_idx ON public.transactions USING btree (user_id, date DESC) WHERE (origin IS NOT NULL);

-- ---------------------------------------------------------------------------
-- triggers
-- ---------------------------------------------------------------------------
CREATE TRIGGER record_intake_outcome BEFORE UPDATE OF status ON ai.intake_items FOR EACH ROW EXECUTE FUNCTION ai.record_intake_outcome();

-- ---------------------------------------------------------------------------
-- fk constraints
-- ---------------------------------------------------------------------------
ALTER TABLE ONLY ai.duplicate_dismissals
    ADD CONSTRAINT duplicate_dismissals_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.duplicate_scans
    ADD CONSTRAINT duplicate_scans_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.intake_events
    ADD CONSTRAINT intake_events_item_id_fkey FOREIGN KEY (item_id) REFERENCES ai.intake_items(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.intake_events
    ADD CONSTRAINT intake_events_message_id_fkey FOREIGN KEY (message_id) REFERENCES ai.intake_messages(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.intake_items
    ADD CONSTRAINT intake_items_message_id_fkey FOREIGN KEY (message_id) REFERENCES ai.intake_messages(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.intake_items
    ADD CONSTRAINT intake_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.intake_messages
    ADD CONSTRAINT intake_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.model_calls
    ADD CONSTRAINT model_calls_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.question_measurements
    ADD CONSTRAINT question_measurements_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.source_artifacts
    ADD CONSTRAINT source_artifacts_intake_message_id_fkey FOREIGN KEY (intake_message_id) REFERENCES ai.intake_messages(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.source_artifacts
    ADD CONSTRAINT source_artifacts_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.transaction_source_links
    ADD CONSTRAINT transaction_source_links_intake_item_id_fkey FOREIGN KEY (intake_item_id) REFERENCES ai.intake_items(id);
ALTER TABLE ONLY ai.transaction_source_links
    ADD CONSTRAINT transaction_source_links_source_artifact_id_fkey FOREIGN KEY (source_artifact_id) REFERENCES ai.source_artifacts(id) ON DELETE SET NULL;
ALTER TABLE ONLY ai.transaction_source_links
    ADD CONSTRAINT transaction_source_links_transaction_id_fkey FOREIGN KEY (transaction_id) REFERENCES public.transactions(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.usage_counters
    ADD CONSTRAINT usage_counters_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.usage_events
    ADD CONSTRAINT usage_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.usage_rate
    ADD CONSTRAINT usage_rate_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE ONLY ai.user_rules
    ADD CONSTRAINT user_rules_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------
-- row securitys
-- ---------------------------------------------------------------------------
ALTER TABLE ai.duplicate_dismissals ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.duplicate_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.intake_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.intake_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.intake_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.model_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.question_measurements ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.source_artifacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.transaction_source_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.usage_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.usage_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.usage_rate ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai.user_rules ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------------------
-- policys
-- ---------------------------------------------------------------------------
CREATE POLICY duplicate_dismissals_select ON ai.duplicate_dismissals FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY duplicate_scans_select ON ai.duplicate_scans FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY intake_items_select ON ai.intake_items FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY intake_messages_select ON ai.intake_messages FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY question_measurements_select ON ai.question_measurements FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY source_artifacts_select ON ai.source_artifacts FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));
CREATE POLICY transaction_source_links_select ON ai.transaction_source_links FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.transactions t
  WHERE ((t.id = transaction_source_links.transaction_id) AND (t.user_id = ( SELECT auth.uid() AS uid))))));
CREATE POLICY user_rules_select ON ai.user_rules FOR SELECT TO authenticated USING ((( SELECT auth.uid() AS uid) = user_id));

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA ai TO authenticated;
GRANT USAGE ON SCHEMA ai TO service_role;
REVOKE ALL ON FUNCTION ai.approve_user_rule(p_name text, p_type text, p_effective_from date) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.approve_user_rule(p_name text, p_type text, p_effective_from date) TO authenticated;
REVOKE ALL ON FUNCTION ai.attach_receipt_artifact(p_item_id uuid, p_artifact_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.attach_receipt_artifact(p_item_id uuid, p_artifact_id uuid) TO authenticated;
REVOKE ALL ON FUNCTION ai.commit_intake_items(p_items jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.commit_intake_items(p_items jsonb) TO authenticated;
REVOKE ALL ON FUNCTION ai.consume_call(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.consume_usage(p_user_id uuid, p_kind text, p_turn uuid, p_op text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.create_text_intake(p_payload jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.create_text_intake(p_payload jsonb) TO authenticated;
REVOKE ALL ON FUNCTION ai.create_text_intake_items(p_payload jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.create_text_intake_items(p_payload jsonb) TO authenticated;
REVOKE ALL ON FUNCTION ai.disable_user_rule(p_name text, p_type text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.disable_user_rule(p_name text, p_type text) TO authenticated;
REVOKE ALL ON FUNCTION ai.list_expired_receipt_artifacts() FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.list_expired_receipt_artifacts() TO service_role;
REVOKE ALL ON FUNCTION ai.mark_receipt_artifacts_deleted(p_ids uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.mark_receipt_artifacts_deleted(p_ids uuid[]) TO service_role;
REVOKE ALL ON FUNCTION ai.matching_duplicate_candidates(p_uid uuid, p_type text, p_date date, p_amount numeric, p_currency text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.question_totals(p_uid uuid, p_types text[], p_from date, p_to date, p_payment_method text, p_category text, p_description text, p_recipient text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.receipt_artifact_id_for_path(p_user_id uuid, p_storage_path text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.receipt_artifact_id_for_path(p_user_id uuid, p_storage_path text) TO service_role;
REVOKE ALL ON FUNCTION ai.receipt_artifact_path(p_user_id uuid, p_artifact_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.receipt_artifact_path(p_user_id uuid, p_artifact_id uuid) TO service_role;
REVOKE ALL ON FUNCTION ai.receipt_storage_path(p_user_id uuid, p_transaction_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.receipt_storage_path(p_user_id uuid, p_transaction_id uuid) TO service_role;
REVOKE ALL ON FUNCTION ai.record_intake_outcome() FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.record_model_call(p_user_id uuid, p_operation text, p_model text, p_ok boolean, p_http_status integer, p_error_code text, p_latency_ms integer, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric, p_generation_id text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.record_question_slot_confidence(p_user_id uuid, p_signals jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.record_receipt_artifact(p_user_id uuid, p_sha256 text, p_mime text, p_size bigint, p_storage_path text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.record_receipt_artifact(p_user_id uuid, p_sha256 text, p_mime text, p_size bigint, p_storage_path text) TO service_role;
REVOKE ALL ON FUNCTION ai.release_usage(p_usage_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.shadow_auto_save(p_uid uuid, p_payload jsonb) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.take_call(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.undo_intake_commit(p_item_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION ai.undo_intake_commit(p_item_id uuid) TO authenticated;
REVOKE ALL ON FUNCTION ai.usage_quota(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION ai.usage_weight(p_kind text) FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL ON FUNCTION public.ai_question_totals(p_types text[], p_from date, p_to date, p_payment_method text, p_category text, p_description text, p_recipient text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.ai_question_totals(p_types text[], p_from date, p_to date, p_payment_method text, p_category text, p_description text, p_recipient text) TO authenticated;
GRANT ALL ON FUNCTION public.ai_question_totals(p_types text[], p_from date, p_to date, p_payment_method text, p_category text, p_description text, p_recipient text) TO service_role;
REVOKE ALL ON FUNCTION public.approve_ai_user_rule(p_name text, p_type text, p_effective_from date) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.approve_ai_user_rule(p_name text, p_type text, p_effective_from date) TO authenticated;
GRANT ALL ON FUNCTION public.approve_ai_user_rule(p_name text, p_type text, p_effective_from date) TO service_role;
REVOKE ALL ON FUNCTION public.attach_ai_receipt_artifact(p_item_id uuid, p_artifact_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.attach_ai_receipt_artifact(p_item_id uuid, p_artifact_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.attach_ai_receipt_artifact(p_item_id uuid, p_artifact_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.commit_ai_intake_items(p_items jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.commit_ai_intake_items(p_items jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.commit_ai_intake_items(p_items jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.consume_ai_call(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.consume_ai_call(p_user_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.consume_ai_usage(p_user_id uuid, p_kind text, p_turn uuid, p_op text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.consume_ai_usage(p_user_id uuid, p_kind text, p_turn uuid, p_op text) TO service_role;
REVOKE ALL ON FUNCTION public.create_ai_text_intake(p_payload jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.create_ai_text_intake(p_payload jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.create_ai_text_intake(p_payload jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.create_ai_text_intake_items(p_payload jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.create_ai_text_intake_items(p_payload jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.create_ai_text_intake_items(p_payload jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.disable_ai_user_rule(p_name text, p_type text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.disable_ai_user_rule(p_name text, p_type text) TO authenticated;
GRANT ALL ON FUNCTION public.disable_ai_user_rule(p_name text, p_type text) TO service_role;
REVOKE ALL ON FUNCTION public.dismiss_ai_duplicate_pair(p_a uuid, p_b uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.dismiss_ai_duplicate_pair(p_a uuid, p_b uuid) TO authenticated;
GRANT ALL ON FUNCTION public.dismiss_ai_duplicate_pair(p_a uuid, p_b uuid) TO service_role;
REVOKE ALL ON FUNCTION public.get_admin_ai_calls(p_from date, p_to date) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_admin_ai_calls(p_from date, p_to date) TO authenticated;
GRANT ALL ON FUNCTION public.get_admin_ai_calls(p_from date, p_to date) TO service_role;
REVOKE ALL ON FUNCTION public.get_admin_ai_stats(p_from date, p_to date) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_admin_ai_stats(p_from date, p_to date) TO authenticated;
GRANT ALL ON FUNCTION public.get_admin_ai_stats(p_from date, p_to date) TO service_role;
REVOKE ALL ON FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[], p_payment_methods text[], p_origin text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[], p_payment_methods text[], p_origin text) TO authenticated;
GRANT ALL ON FUNCTION public.get_user_transactions(p_user_id uuid, p_offset integer, p_limit integer, p_date_from text, p_date_to text, p_types text[], p_search text, p_sort_field text, p_sort_direction text, p_is_recurring boolean, p_recurring_statuses text[], p_recurring_frequencies text[], p_payment_methods text[], p_origin text) TO service_role;
REVOKE ALL ON FUNCTION public.list_ai_duplicate_candidates(p_type text, p_date date, p_amount numeric, p_currency text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.list_ai_duplicate_candidates(p_type text, p_date date, p_amount numeric, p_currency text) TO authenticated;
GRANT ALL ON FUNCTION public.list_ai_duplicate_candidates(p_type text, p_date date, p_amount numeric, p_currency text) TO service_role;
REVOKE ALL ON FUNCTION public.list_ai_reader_rules(p_user_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.list_ai_reader_rules(p_user_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.list_ai_recipients() FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.list_ai_recipients() TO authenticated;
GRANT ALL ON FUNCTION public.list_ai_recipients() TO service_role;
REVOKE ALL ON FUNCTION public.list_ai_saved_duplicate_pairs() FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.list_ai_saved_duplicate_pairs() TO authenticated;
GRANT ALL ON FUNCTION public.list_ai_saved_duplicate_pairs() TO service_role;
REVOKE ALL ON FUNCTION public.list_ai_user_rules() FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.list_ai_user_rules() TO authenticated;
GRANT ALL ON FUNCTION public.list_ai_user_rules() TO service_role;
REVOKE ALL ON FUNCTION public.list_expired_receipt_artifacts() FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.list_expired_receipt_artifacts() TO service_role;
REVOKE ALL ON FUNCTION public.mark_ai_question_outcome(p_measurement_id uuid, p_outcome text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.mark_ai_question_outcome(p_measurement_id uuid, p_outcome text) TO authenticated;
GRANT ALL ON FUNCTION public.mark_ai_question_outcome(p_measurement_id uuid, p_outcome text) TO service_role;
REVOKE ALL ON FUNCTION public.mark_receipt_artifacts_deleted(p_ids uuid[]) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.mark_receipt_artifacts_deleted(p_ids uuid[]) TO service_role;
REVOKE ALL ON FUNCTION public.read_ai_shadow_type_context(p_item_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.read_ai_shadow_type_context(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.read_ai_shadow_type_context(p_item_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.receipt_artifact_id_for_path(p_user_id uuid, p_storage_path text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.receipt_artifact_id_for_path(p_user_id uuid, p_storage_path text) TO service_role;
REVOKE ALL ON FUNCTION public.receipt_artifact_path(p_user_id uuid, p_artifact_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.receipt_artifact_path(p_user_id uuid, p_artifact_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.receipt_storage_path(p_user_id uuid, p_transaction_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.receipt_storage_path(p_user_id uuid, p_transaction_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.record_ai_model_call(p_user_id uuid, p_operation text, p_model text, p_ok boolean, p_http_status integer, p_error_code text, p_latency_ms integer, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric, p_generation_id text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.record_ai_model_call(p_user_id uuid, p_operation text, p_model text, p_ok boolean, p_http_status integer, p_error_code text, p_latency_ms integer, p_input_tokens integer, p_output_tokens integer, p_cost_usd numeric, p_generation_id text) TO service_role;
REVOKE ALL ON FUNCTION public.record_ai_receipt_artifact(p_user_id uuid, p_sha256 text, p_mime text, p_size bigint, p_storage_path text) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.record_ai_receipt_artifact(p_user_id uuid, p_sha256 text, p_mime text, p_size bigint, p_storage_path text) TO service_role;
REVOKE ALL ON FUNCTION public.record_ai_shadow_category(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.record_ai_shadow_category(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) TO service_role;
REVOKE ALL ON FUNCTION public.record_ai_shadow_type(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.record_ai_shadow_type(p_item_id uuid, p_user_id uuid, p_choice text, p_confidence numeric) TO service_role;
REVOKE ALL ON FUNCTION public.record_ai_slot_confidence(p_user_id uuid, p_signals jsonb) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.record_ai_slot_confidence(p_user_id uuid, p_signals jsonb) TO service_role;
REVOKE ALL ON FUNCTION public.reject_uncommitted_ai_item(p_item_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.reject_uncommitted_ai_item(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.reject_uncommitted_ai_item(p_item_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.release_ai_usage(p_usage_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.release_ai_usage(p_usage_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.undo_ai_intake_commit(p_item_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.undo_ai_intake_commit(p_item_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.undo_ai_intake_commit(p_item_id uuid) TO service_role;
REVOKE ALL ON FUNCTION public.undo_ai_transaction(p_transaction_id uuid) FROM PUBLIC, anon, authenticated, service_role;
GRANT ALL ON FUNCTION public.undo_ai_transaction(p_transaction_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.undo_ai_transaction(p_transaction_id uuid) TO service_role;
GRANT SELECT ON TABLE ai.duplicate_dismissals TO authenticated;
GRANT ALL ON TABLE ai.duplicate_dismissals TO service_role;
GRANT SELECT ON TABLE ai.duplicate_scans TO authenticated;
GRANT ALL ON TABLE ai.duplicate_scans TO service_role;
GRANT ALL ON TABLE ai.intake_events TO service_role;
GRANT SELECT ON TABLE ai.intake_items TO authenticated;
GRANT ALL ON TABLE ai.intake_items TO service_role;
GRANT SELECT ON TABLE ai.intake_messages TO authenticated;
GRANT ALL ON TABLE ai.intake_messages TO service_role;
GRANT ALL ON TABLE ai.model_calls TO service_role;
GRANT SELECT ON TABLE ai.question_measurements TO authenticated;
GRANT ALL ON TABLE ai.question_measurements TO service_role;
GRANT SELECT ON TABLE ai.source_artifacts TO authenticated;
GRANT ALL ON TABLE ai.source_artifacts TO service_role;
GRANT SELECT ON TABLE ai.transaction_source_links TO authenticated;
GRANT ALL ON TABLE ai.transaction_source_links TO service_role;
GRANT ALL ON TABLE ai.usage_counters TO service_role;
GRANT ALL ON TABLE ai.usage_events TO service_role;
GRANT ALL ON TABLE ai.usage_rate TO service_role;
GRANT SELECT ON TABLE ai.user_rules TO authenticated;
GRANT ALL ON TABLE ai.user_rules TO service_role;

-- ---------------------------------------------------------------------------
-- Storage bucket for receipts and voice (private)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('intake-artifacts', 'intake-artifacts', false, 20971520, '{image/jpeg,image/png,image/webp,application/pdf,audio/mpeg,audio/mp4,audio/ogg,audio/wav,audio/webm}')
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- Cron jobs
-- ---------------------------------------------------------------------------
SELECT cron.schedule('ai-model-calls-retention', '45 4 * * *', $cron$DELETE FROM ai.model_calls WHERE created_at < now() - interval '13 months'$cron$);
SELECT cron.schedule('ai-purge-expired-receipts', '30 4 * * *', $cron$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1) || '/functions/v1/ai-purge-receipts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
  $cron$);
SELECT cron.schedule('ai-usage-cleanup', '50 4 * * *', $cron$
    DELETE FROM ai.usage_rate WHERE bucket_start < now() - interval '2 days';
    DELETE FROM ai.usage_events WHERE created_at < now() - interval '13 months';
    DELETE FROM ai.usage_counters WHERE period_start < (now() - interval '13 months')::date;
  $cron$);

RESET check_function_bodies;
