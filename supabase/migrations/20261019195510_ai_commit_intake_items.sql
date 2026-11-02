-- Deterministic commit of approved AI intake items.
-- The caller is the signed-in user. The function never trusts a user id in the payload.
-- Auto-save is intentionally not implemented here.
-- One failure aborts the whole call, so a multi-item receipt is never saved in part.

CREATE OR REPLACE FUNCTION ai.commit_intake_items(p_items jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION ai.commit_intake_items(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ai.commit_intake_items(jsonb) TO authenticated;

DO $check$
BEGIN
  IF has_function_privilege('anon', 'ai.commit_intake_items(jsonb)', 'execute') THEN
    RAISE EXCEPTION 'anon must not execute ai.commit_intake_items';
  END IF;
  IF NOT has_function_privilege('authenticated', 'ai.commit_intake_items(jsonb)', 'execute') THEN
    RAISE EXCEPTION 'authenticated must execute ai.commit_intake_items';
  END IF;
END;
$check$;
