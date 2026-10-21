-- Roll back the receipt artifact guards and restore the previous record RPC.

DO $unschedule$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-purge-expired-receipts') THEN
    PERFORM cron.unschedule('ai-purge-expired-receipts');
  END IF;
END;
$unschedule$;

DROP FUNCTION IF EXISTS public.list_expired_receipt_artifacts();
DROP FUNCTION IF EXISTS ai.list_expired_receipt_artifacts();
DROP FUNCTION IF EXISTS public.mark_receipt_artifacts_deleted(uuid[]);
DROP FUNCTION IF EXISTS ai.mark_receipt_artifacts_deleted(uuid[]);
DROP FUNCTION IF EXISTS public.record_ai_receipt_artifact(uuid, text, text, bigint, text);
DROP FUNCTION IF EXISTS ai.record_receipt_artifact(uuid, text, text, bigint, text);

DROP INDEX IF EXISTS ai.source_artifacts_active_sha256_idx;
-- Record a checked receipt in ai.source_artifacts. The edge function uploads the
-- bytes first. Authenticated users can read their own rows; this RPC is the write.
-- The file stays temporary for 30 days. The draft response does not change.

CREATE OR REPLACE FUNCTION ai.record_receipt_artifact(
  p_sha256 text,
  p_mime text,
  p_size bigint,
  p_storage_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_kind text;
  v_message_id uuid;
  v_existing text;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'ARTIFACT_REJECTED';
  END IF;

  IF p_mime = 'application/pdf' THEN
    v_kind := 'pdf';
    IF p_size IS NULL OR p_size <= 0 OR p_size > 15728640 THEN
      RAISE EXCEPTION 'ARTIFACT_REJECTED';
    END IF;
  ELSIF p_mime IN ('image/jpeg', 'image/png', 'image/webp') THEN
    v_kind := 'image';
    IF p_size IS NULL OR p_size <= 0 OR p_size > 10485760 THEN
      RAISE EXCEPTION 'ARTIFACT_REJECTED';
    END IF;
  ELSE
    RAISE EXCEPTION 'ARTIFACT_REJECTED';
  END IF;

  IF p_storage_path !~ (
    '^' || v_uid::text || '/[0-9]{4}/[0-9]{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'ARTIFACT_REJECTED';
  END IF;

  SELECT storage_path
  INTO v_existing
  FROM ai.source_artifacts
  WHERE user_id = v_uid
    AND sha256 = p_sha256
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('storage_path', v_existing, 'already_stored', true);
  END IF;

  INSERT INTO ai.intake_messages (
    user_id,
    channel,
    content_kind,
    idempotency_key,
    status,
    received_at,
    expires_at
  ) VALUES (
    v_uid,
    'web',
    v_kind,
    p_sha256,
    'received',
    now(),
    now() + interval '30 days'
  )
  ON CONFLICT (user_id, idempotency_key) DO NOTHING
  RETURNING id INTO v_message_id;

  IF v_message_id IS NULL THEN
    SELECT artifact.storage_path
    INTO v_existing
    FROM ai.source_artifacts AS artifact
    JOIN ai.intake_messages AS message ON message.id = artifact.intake_message_id
    WHERE message.user_id = v_uid
      AND message.idempotency_key = p_sha256
      AND artifact.deleted_at IS NULL
    LIMIT 1;

    IF v_existing IS NULL THEN
      RAISE EXCEPTION 'ARTIFACT_REJECTED';
    END IF;

    RETURN jsonb_build_object('storage_path', v_existing, 'already_stored', true);
  END IF;

  INSERT INTO ai.source_artifacts (
    user_id,
    intake_message_id,
    storage_bucket,
    storage_path,
    media_type,
    mime_type,
    file_size,
    sha256,
    retention_mode,
    expires_at
  ) VALUES (
    v_uid,
    v_message_id,
    'intake-artifacts',
    p_storage_path,
    v_kind,
    p_mime,
    p_size,
    p_sha256,
    'temporary',
    now() + interval '30 days'
  );

  RETURN jsonb_build_object('storage_path', p_storage_path, 'already_stored', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_ai_receipt_artifact(
  p_sha256 text,
  p_mime text,
  p_size bigint,
  p_storage_path text
)
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.record_receipt_artifact(p_sha256, p_mime, p_size, p_storage_path);
$$;

REVOKE ALL ON FUNCTION ai.record_receipt_artifact(text, text, bigint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.record_ai_receipt_artifact(text, text, bigint, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION ai.record_receipt_artifact(text, text, bigint, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_receipt_artifact(text, text, bigint, text) TO authenticated;

