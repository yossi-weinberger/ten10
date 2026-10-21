-- Look up a stored receipt by its id. The edge function signs the URL only
-- after this confirms the file belongs to the user.

CREATE OR REPLACE FUNCTION ai.receipt_artifact_path(
  p_user_id uuid,
  p_artifact_id uuid
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

  IF p_user_id IS NULL OR p_artifact_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT storage_path
  INTO v_path
  FROM ai.source_artifacts
  WHERE id = p_artifact_id
    AND user_id = p_user_id
    AND deleted_at IS NULL
    AND storage_path LIKE p_user_id::text || '/%'
    AND storage_path NOT LIKE '%..%'
  LIMIT 1;

  RETURN v_path;
END;
$function$;

CREATE OR REPLACE FUNCTION public.receipt_artifact_path(
  p_user_id uuid,
  p_artifact_id uuid
)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.receipt_artifact_path(p_user_id, p_artifact_id);
$$;

REVOKE ALL ON FUNCTION ai.receipt_artifact_path(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.receipt_artifact_path(uuid, uuid) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION ai.receipt_artifact_path(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.receipt_artifact_path(uuid, uuid) TO service_role;
