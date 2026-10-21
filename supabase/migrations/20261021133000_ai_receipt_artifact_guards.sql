-- Receipt artifact guards. The record RPC is service-role only and limited to the
-- testing trial allowlist (keep the ids in sync with trial-users.ts). A deleted
-- artifact does not block the same file. Expired temporary files are removed daily.

CREATE UNIQUE INDEX IF NOT EXISTS source_artifacts_active_sha256_idx
  ON ai.source_artifacts (user_id, sha256)
  WHERE deleted_at IS NULL;

DROP FUNCTION IF EXISTS public.record_ai_receipt_artifact(text, text, bigint, text);
DROP FUNCTION IF EXISTS ai.record_receipt_artifact(text, text, bigint, text);

CREATE OR REPLACE FUNCTION ai.record_receipt_artifact(
  p_user_id uuid,
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
  v_kind text;
  v_message_id uuid;
  v_existing text;
  v_key text;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  IF p_user_id IS NULL OR p_user_id NOT IN (
    '01665dce-d261-4a9b-b89d-04ce2460859b'::uuid,
    '45e3efc0-171b-48ce-9f15-4468394dfaeb'::uuid,
    'a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4'::uuid,
    '5403d7d1-3f44-4243-a84a-f905c4aad30c'::uuid,
    'f336e5d1-4dc2-40c6-b176-c0b199ee836d'::uuid,
    'a3f81dec-f634-4784-9cc0-9921838a6037'::uuid,
    'c4e7d297-9ed3-421a-af9c-92ccccf95ba0'::uuid
  ) THEN
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
    '^' || p_user_id::text || '/[0-9]{4}/[0-9]{2}/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  ) THEN
    RAISE EXCEPTION 'ARTIFACT_REJECTED';
  END IF;

  v_key := split_part(p_storage_path, '/', 4);

  SELECT storage_path
  INTO v_existing
  FROM ai.source_artifacts
  WHERE user_id = p_user_id
    AND sha256 = p_sha256
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_existing IS NOT NULL THEN
    RETURN jsonb_build_object('storage_path', v_existing, 'already_stored', true);
  END IF;

  BEGIN
    INSERT INTO ai.intake_messages (
      user_id,
      channel,
      content_kind,
      idempotency_key,
      status,
      received_at,
      expires_at
    ) VALUES (
      p_user_id,
      'web',
      v_kind,
      v_key,
      'received',
      now(),
      now() + interval '30 days'
    )
    RETURNING id INTO v_message_id;

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
      p_user_id,
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
  EXCEPTION
    WHEN unique_violation THEN
      SELECT storage_path
      INTO v_existing
      FROM ai.source_artifacts
      WHERE user_id = p_user_id
        AND sha256 = p_sha256
        AND deleted_at IS NULL
      LIMIT 1;

      IF v_existing IS NULL THEN
        RAISE EXCEPTION 'ARTIFACT_REJECTED';
      END IF;

      RETURN jsonb_build_object('storage_path', v_existing, 'already_stored', true);
  END;

  RETURN jsonb_build_object('storage_path', p_storage_path, 'already_stored', false);
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_ai_receipt_artifact(
  p_user_id uuid,
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
  SELECT ai.record_receipt_artifact(p_user_id, p_sha256, p_mime, p_size, p_storage_path);
$$;

REVOKE ALL ON FUNCTION ai.record_receipt_artifact(uuid, text, text, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ai_receipt_artifact(uuid, text, text, bigint, text) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION ai.record_receipt_artifact(uuid, text, text, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.record_ai_receipt_artifact(uuid, text, text, bigint, text) TO service_role;

CREATE OR REPLACE FUNCTION ai.list_expired_receipt_artifacts()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  RETURN (
    SELECT coalesce(jsonb_agg(jsonb_build_object('id', id, 'storage_path', storage_path)), '[]'::jsonb)
    FROM (
      SELECT id, storage_path
      FROM ai.source_artifacts
      WHERE deleted_at IS NULL
        AND retention_mode = 'temporary'
        AND expires_at IS NOT NULL
        AND expires_at < now()
      ORDER BY expires_at
      LIMIT 200
    ) AS expired
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_expired_receipt_artifacts()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.list_expired_receipt_artifacts();
$$;

CREATE OR REPLACE FUNCTION ai.mark_receipt_artifacts_deleted(p_ids uuid[])
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_count integer := 0;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;

  UPDATE ai.source_artifacts
  SET deleted_at = now()
  WHERE id = ANY (coalesce(p_ids, '{}'::uuid[]))
    AND deleted_at IS NULL
    AND retention_mode = 'temporary'
    AND expires_at IS NOT NULL
    AND expires_at < now();

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.mark_receipt_artifacts_deleted(p_ids uuid[])
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT ai.mark_receipt_artifacts_deleted(p_ids);
$$;

REVOKE ALL ON FUNCTION ai.list_expired_receipt_artifacts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_expired_receipt_artifacts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION ai.mark_receipt_artifacts_deleted(uuid[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_receipt_artifacts_deleted(uuid[]) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION ai.list_expired_receipt_artifacts() TO service_role;
GRANT EXECUTE ON FUNCTION public.list_expired_receipt_artifacts() TO service_role;
GRANT EXECUTE ON FUNCTION ai.mark_receipt_artifacts_deleted(uuid[]) TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_receipt_artifacts_deleted(uuid[]) TO service_role;

DO $unschedule$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'ai-purge-expired-receipts') THEN
    PERFORM cron.unschedule('ai-purge-expired-receipts');
  END IF;
END;
$unschedule$;

SELECT cron.schedule(
  'ai-purge-expired-receipts',
  '30 4 * * *',
  $$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1) || '/functions/v1/ai-purge-receipts',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
  $$
);
