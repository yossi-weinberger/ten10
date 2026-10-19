-- Undo from the transactions table, which knows the transaction id and not the
-- intake item id. The same ownership, edit, and 7-day checks stay in
-- ai.undo_intake_commit.

CREATE OR REPLACE FUNCTION public.undo_ai_transaction(p_transaction_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

REVOKE ALL ON FUNCTION public.undo_ai_transaction(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.undo_ai_transaction(uuid) TO authenticated;

DO $check$
BEGIN
  IF has_function_privilege('anon', 'public.undo_ai_transaction(uuid)', 'execute') THEN
    RAISE EXCEPTION 'anon must not execute undo_ai_transaction';
  END IF;
  IF NOT has_function_privilege('authenticated', 'public.undo_ai_transaction(uuid)', 'execute') THEN
    RAISE EXCEPTION 'authenticated must execute undo_ai_transaction';
  END IF;
END;
$check$;
