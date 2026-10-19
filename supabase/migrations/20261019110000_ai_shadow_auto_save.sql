-- Record whether a text draft would have qualified for auto-save.
-- The commit path is unchanged: origin stays 'ai', and nothing is saved automatically.
-- would_auto_save stays false until decide() is connected. The other checks are stored now.

CREATE OR REPLACE FUNCTION ai.shadow_auto_save(p_uid uuid, p_payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
    FROM public.transactions AS prior
    WHERE prior.user_id = p_uid
      AND prior.type = v_type
      AND prior.date BETWEEN v_date - 3 AND v_date + 3
      AND prior.amount BETWEEN v_amount * 0.98 AND v_amount * 1.02
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
$function$;

REVOKE ALL ON FUNCTION ai.shadow_auto_save(uuid, jsonb) FROM PUBLIC, anon, authenticated;

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
    jsonb_build_object('shadow_auto_save', ai.shadow_auto_save(v_uid, p_payload))
  )
  RETURNING id, version INTO v_item_id, v_version;

  RETURN jsonb_build_object('item_id', v_item_id, 'version', v_version);
END;
$function$;
