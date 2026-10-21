-- After a receipt is saved, link the committed transaction to its stored file.
-- The client receives the artifact id, never a URL.

CREATE OR REPLACE FUNCTION ai.receipt_artifact_id_for_path(
  p_user_id uuid,
  p_storage_path text
)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.receipt_artifact_id_for_path(
  p_user_id uuid,
  p_storage_path text
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.receipt_artifact_id_for_path(p_user_id, p_storage_path);
$$;

CREATE OR REPLACE FUNCTION ai.attach_receipt_artifact(
  p_item_id uuid,
  p_artifact_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.attach_ai_receipt_artifact(
  p_item_id uuid,
  p_artifact_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.attach_receipt_artifact(p_item_id, p_artifact_id);
$$;

REVOKE ALL ON FUNCTION ai.receipt_artifact_id_for_path(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.receipt_artifact_id_for_path(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION ai.attach_receipt_artifact(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.attach_ai_receipt_artifact(uuid, uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION ai.receipt_artifact_id_for_path(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.receipt_artifact_id_for_path(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION ai.attach_receipt_artifact(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.attach_ai_receipt_artifact(uuid, uuid) TO authenticated;
