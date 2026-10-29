-- One message, several intake items. A later call with the same key returns the same rows.
-- Saving them still goes through ai.commit_intake_items, which aborts the whole call on one failure.

CREATE OR REPLACE FUNCTION ai.create_text_intake_items(p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.create_ai_text_intake_items(p_payload jsonb)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.create_text_intake_items(p_payload);
$$;

REVOKE ALL ON FUNCTION ai.create_text_intake_items(jsonb) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_ai_text_intake_items(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ai.create_text_intake_items(jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_ai_text_intake_items(jsonb) TO authenticated;
