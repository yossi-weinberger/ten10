-- Undo one committed intake item. Deletes the transaction it created, marks the
-- item reverted, and records an event. Allowed only for the signed-in owner,
-- within 7 days, and only when the transaction was not edited after insert.
-- The ai schema is not on the Data API, so clients call the public wrapper.

CREATE OR REPLACE FUNCTION ai.undo_intake_commit(p_item_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.undo_ai_intake_commit(p_item_id uuid)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.undo_intake_commit(p_item_id);
$$;

REVOKE ALL ON FUNCTION ai.undo_intake_commit(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.undo_ai_intake_commit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION ai.undo_intake_commit(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.undo_ai_intake_commit(uuid) TO authenticated;

DO $check$
BEGIN
  IF has_function_privilege('anon', 'public.undo_ai_intake_commit(uuid)', 'execute') THEN
    RAISE EXCEPTION 'anon must not execute undo_ai_intake_commit';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.undo_ai_intake_commit(uuid)', 'execute') THEN
    RAISE EXCEPTION 'authenticated must execute undo_ai_intake_commit';
  END IF;
END;
$check$;
