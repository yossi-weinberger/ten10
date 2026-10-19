-- Keep the check-currency amount, and make a negative amount's 2% window ordered.

CREATE OR REPLACE FUNCTION ai.matching_duplicate_candidates(
  p_uid uuid,
  p_type text,
  p_date date,
  p_amount numeric,
  p_currency text
)
RETURNS TABLE (
  id text,
  candidate_date text,
  amount numeric,
  description text,
  kind text,
  distance integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
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
$$;

REVOKE ALL ON FUNCTION ai.matching_duplicate_candidates(uuid, text, date, numeric, text) FROM PUBLIC, anon, authenticated;

-- extracted_amount is what the parser found. original_amount stays the pre-conversion amount.
-- A default-currency draft must not keep conversion keys, or commit rejects the save.

CREATE OR REPLACE FUNCTION ai.create_text_intake(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.reject_uncommitted_ai_item(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.reject_uncommitted_ai_item(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.reject_uncommitted_ai_item(uuid) TO authenticated;

DROP FUNCTION IF EXISTS public.record_ai_shadow_type(uuid, text, numeric);
DROP FUNCTION IF EXISTS public.record_ai_shadow_category(uuid, text, numeric);

CREATE OR REPLACE FUNCTION public.record_ai_shadow_type(
  p_item_id uuid,
  p_user_id uuid,
  p_choice text,
  p_confidence numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.record_ai_shadow_category(
  p_item_id uuid,
  p_user_id uuid,
  p_choice text,
  p_confidence numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.record_ai_shadow_type(uuid, uuid, text, numeric) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ai_shadow_category(uuid, uuid, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_shadow_type(uuid, uuid, text, numeric) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_shadow_category(uuid, uuid, text, numeric) TO service_role;

DO $check$
BEGIN
  IF has_function_privilege('anon', 'public.record_ai_shadow_type(uuid, uuid, text, numeric)', 'execute')
     OR has_function_privilege('authenticated', 'public.record_ai_shadow_type(uuid, uuid, text, numeric)', 'execute')
     OR has_function_privilege('anon', 'public.record_ai_shadow_category(uuid, uuid, text, numeric)', 'execute')
     OR has_function_privilege('authenticated', 'public.record_ai_shadow_category(uuid, uuid, text, numeric)', 'execute') THEN
    RAISE EXCEPTION 'only service_role may record a shadow choice';
  END IF;
END;
$check$;
