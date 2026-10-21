-- The signed URL is created by the edge function. This RPC only returns the path
-- after it checks that the transaction and the file belong to the same user.

CREATE OR REPLACE FUNCTION ai.receipt_storage_path(
  p_user_id uuid,
  p_transaction_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.receipt_storage_path(
  p_user_id uuid,
  p_transaction_id uuid
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.receipt_storage_path(p_user_id, p_transaction_id);
$$;

REVOKE ALL ON FUNCTION ai.receipt_storage_path(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.receipt_storage_path(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION ai.receipt_storage_path(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.receipt_storage_path(uuid, uuid) TO service_role;
