-- The server compares the saved description and amount with the extracted originals.
-- A client flag is not trusted. Auto-save stays off.

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

    RETURN jsonb_build_object('item_id', v_item_id, 'version', v_version);
  END IF;

  INSERT INTO ai.intake_items (
    message_id,
    user_id,
    item_index,
    status,
    normalized_payload,
    quality_signals
  ) VALUES (
    v_message_id,
    v_uid,
    0,
    'ready',
    p_payload,
    jsonb_build_object(
      'shadow_auto_save', ai.shadow_auto_save(v_uid, p_payload),
      'user_edited', v_user_edited
    )
  )
  RETURNING id, version INTO v_item_id, v_version;

  RETURN jsonb_build_object('item_id', v_item_id, 'version', v_version);
END;
$function$;
