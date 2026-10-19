-- Record the user's answer to a stage-2 duplicate warning.
-- saved_anyway still commits. same_event stores a rejected item and does not commit.
-- Candidate ids are kept only when they belong to the caller and match the window.

CREATE OR REPLACE FUNCTION public.list_ai_duplicate_candidates(
  p_type text,
  p_date date,
  p_amount numeric,
  p_currency text
)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT coalesce(jsonb_agg(row_to_json(found)), '[]'::jsonb)
  FROM (
    SELECT
      prior.id::text AS id,
      prior.date::text AS date,
      prior.amount,
      left(coalesce(prior.description, ''), 80) AS description
    FROM public.transactions AS prior
    WHERE prior.user_id = auth.uid()
      AND prior.type = p_type
      AND p_amount IS NOT NULL
      AND p_amount <> 0
      AND prior.date BETWEEN p_date - 3 AND p_date + 3
      AND (
        (
          upper(coalesce(prior.currency, '')) = upper(coalesce(p_currency, ''))
          AND prior.amount BETWEEN p_amount * 0.98 AND p_amount * 1.02
        )
        OR (
          prior.original_amount IS NOT NULL
          AND upper(coalesce(prior.original_currency, '')) = upper(coalesce(p_currency, ''))
          AND prior.original_amount = p_amount
        )
      )
    ORDER BY abs(prior.date - p_date), prior.date DESC
    LIMIT 20
  ) AS found;
$$;

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
  v_original_amount numeric;
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

  IF (p_payload->>'original_amount') ~ '^-?[0-9]+(\.[0-9]+)?$' THEN
    v_original_amount := (p_payload->>'original_amount')::numeric;
  ELSE
    v_original_amount := v_amount;
  END IF;

  v_user_edited :=
    lower(btrim(coalesce(p_payload->>'description', '')))
      IS DISTINCT FROM lower(btrim(coalesce(
        p_payload->>'original_description',
        p_payload->>'description',
        ''
      )))
    OR v_amount IS DISTINCT FROM v_original_amount;

  v_choice := p_payload->>'duplicate_choice';
  IF v_choice IS DISTINCT FROM 'saved_anyway' AND v_choice IS DISTINCT FROM 'same_event' THEN
    v_choice := NULL;
  END IF;

  v_check_amount := CASE
    WHEN (p_payload->>'original_amount') ~ '^-?[0-9]+(\.[0-9]+)?$'
      THEN (p_payload->>'original_amount')::numeric
    ELSE v_amount
  END;
  v_check_currency := coalesce(
    nullif(upper(btrim(p_payload->>'original_currency')), ''),
    upper(btrim(p_payload->>'currency'))
  );

  IF v_choice IS NOT NULL AND jsonb_typeof(p_payload->'duplicate_candidate_ids') = 'array' THEN
    SELECT coalesce(jsonb_agg(found.id), '[]'::jsonb)
    INTO v_candidates
    FROM (
      SELECT prior.id::text AS id
      FROM public.transactions AS prior
      WHERE prior.user_id = v_uid
        AND prior.id::text IN (
          SELECT jsonb_array_elements_text(p_payload->'duplicate_candidate_ids')
        )
        AND prior.type = v_type
        AND prior.date BETWEEN (p_payload->>'date')::date - 3 AND (p_payload->>'date')::date + 3
        AND (
          (
            upper(coalesce(prior.currency, '')) = v_check_currency
            AND prior.amount BETWEEN v_check_amount * 0.98 AND v_check_amount * 1.02
          )
          OR (
            prior.original_amount IS NOT NULL
            AND upper(coalesce(prior.original_currency, '')) = v_check_currency
            AND prior.original_amount = v_check_amount
          )
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
    WHEN v_choice = 'same_event' THEN (v_candidates->>0)::uuid
    ELSE NULL
  END;

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
