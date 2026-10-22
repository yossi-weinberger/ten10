-- One SQL allowlist. Edge code keeps its own copy in trial-users.ts.

CREATE OR REPLACE FUNCTION ai.is_trial_user(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $$
  SELECT p_user_id IN (
    '01665dce-d261-4a9b-b89d-04ce2460859b'::uuid,
    '45e3efc0-171b-48ce-9f15-4468394dfaeb'::uuid,
    'a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4'::uuid,
    '5403d7d1-3f44-4243-a84a-f905c4aad30c'::uuid,
    'f336e5d1-4dc2-40c6-b176-c0b199ee836d'::uuid,
    'a3f81dec-f634-4784-9cc0-9921838a6037'::uuid,
    'c4e7d297-9ed3-421a-af9c-92ccccf95ba0'::uuid
  );
$$;

REVOKE ALL ON FUNCTION ai.is_trial_user(uuid) FROM PUBLIC, anon, authenticated;

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

  IF p_user_id IS NULL OR NOT ai.is_trial_user(p_user_id) THEN
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


DROP FUNCTION IF EXISTS public.record_ai_slot_confidence(jsonb);
DROP FUNCTION IF EXISTS public.record_ai_slot_confidence(uuid, jsonb);
DROP FUNCTION IF EXISTS ai.record_question_slot_confidence(uuid, jsonb);

CREATE OR REPLACE FUNCTION ai.record_question_slot_confidence(
  p_user_id uuid,
  p_signals jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
DECLARE
  v_field text;
  v_slots jsonb := '{}'::jsonb;
  v_id uuid;
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  IF NOT ai.is_trial_user(p_user_id) THEN
    RETURN NULL;
  END IF;
  IF p_signals IS NULL OR jsonb_typeof(p_signals) IS DISTINCT FROM 'object' THEN
    RETURN NULL;
  END IF;

  FOREACH v_field IN ARRAY ARRAY['family', 'measure', 'recipient', 'category', 'payment_method']
  LOOP
    IF (p_signals->>v_field) ~ '^(0(\.[0-9]+)?|1(\.0+)?)$' THEN
      v_slots := v_slots || jsonb_build_object(v_field, (p_signals->>v_field)::numeric);
    END IF;
  END LOOP;

  IF v_slots = '{}'::jsonb THEN
    RETURN NULL;
  END IF;

  INSERT INTO ai.question_measurements (user_id, quality_signals)
  VALUES (p_user_id, jsonb_build_object('slot_confidence', v_slots))
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.record_ai_slot_confidence(
  p_user_id uuid,
  p_signals jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO pg_catalog, public, ai
AS $function$
BEGIN
  IF coalesce(auth.role(), '') IS DISTINCT FROM 'service_role' OR p_user_id IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  RETURN ai.record_question_slot_confidence(p_user_id, p_signals);
END;
$function$;

REVOKE ALL ON FUNCTION ai.record_question_slot_confidence(uuid, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_ai_slot_confidence(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_slot_confidence(uuid, jsonb) TO service_role;
