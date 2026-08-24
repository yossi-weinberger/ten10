-- Add jsonb patch overloads for bulk edit v2.
-- Keep the live (uuid, uuid[], text, text) signatures so V1 web clients
-- that still send p_field/p_value continue to work.

DO $preconditions$
BEGIN
  IF to_regprocedure('public.bulk_update_user_transactions(uuid,uuid[],text,text)') IS NULL THEN
    RAISE EXCEPTION 'Required function is missing before jsonb patch migration: public.bulk_update_user_transactions(uuid,uuid[],text,text)';
  END IF;

  IF to_regprocedure('public.bulk_update_user_recurring_transactions(uuid,uuid[],text,text)') IS NULL THEN
    RAISE EXCEPTION 'Required function is missing before jsonb patch migration: public.bulk_update_user_recurring_transactions(uuid,uuid[],text,text)';
  END IF;

  IF to_regprocedure('public.bulk_update_user_transactions(uuid,uuid[],jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'Jsonb transaction bulk updater already exists before additive migration.';
  END IF;

  IF to_regprocedure('public.bulk_update_user_recurring_transactions(uuid,uuid[],jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'Jsonb recurring bulk updater already exists before additive migration.';
  END IF;
END;
$preconditions$;

CREATE FUNCTION public.bulk_update_user_transactions(
  p_user_id uuid,
  p_ids uuid[],
  p_updates jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_input_count integer;
  v_distinct_count integer;
  v_has_null_id boolean;
  v_locked_count integer;
  v_affected_count integer;
  v_has_initial_balance boolean;
  v_all_income_family boolean;
  v_all_expense_family boolean;
  v_all_recipient_family boolean;
  v_distinct_types integer;
  v_shared_type text;
  v_unknown_key text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' OR p_updates = '{}'::jsonb THEN
    RAISE EXCEPTION 'Bulk update requires at least one field.';
  END IF;

  SELECT object_key
  INTO v_unknown_key
  FROM jsonb_object_keys(p_updates) AS keys(object_key)
  WHERE object_key NOT IN ('payment_method', 'category', 'description', 'recipient', 'is_chomesh')
  LIMIT 1;

  IF v_unknown_key IS NOT NULL THEN
    RAISE EXCEPTION 'Unsupported transaction bulk update field: %.', v_unknown_key;
  END IF;

  IF p_updates ? 'payment_method'
     AND jsonb_typeof(p_updates->'payment_method') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Bulk update field payment_method must be a string or null.';
  END IF;

  IF p_updates ? 'category'
     AND jsonb_typeof(p_updates->'category') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Bulk update field category must be a string or null.';
  END IF;

  IF p_updates ? 'recipient'
     AND jsonb_typeof(p_updates->'recipient') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Bulk update field recipient must be a string or null.';
  END IF;

  IF p_updates ? 'description'
     AND jsonb_typeof(p_updates->'description') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Bulk update field description must be a string or null.';
  END IF;

  IF p_updates ? 'payment_method'
     AND p_updates->>'payment_method' IS NOT NULL
     AND char_length(p_updates->>'payment_method') > 50 THEN
    RAISE EXCEPTION 'Bulk update value exceeds the 50 character limit.';
  END IF;

  IF p_updates ? 'category'
     AND p_updates->>'category' IS NOT NULL
     AND char_length(p_updates->>'category') > 50 THEN
    RAISE EXCEPTION 'Bulk update value exceeds the 50 character limit.';
  END IF;

  IF p_updates ? 'recipient'
     AND p_updates->>'recipient' IS NOT NULL
     AND char_length(p_updates->>'recipient') > 50 THEN
    RAISE EXCEPTION 'Bulk update value exceeds the 50 character limit.';
  END IF;

  IF p_updates ? 'description'
     AND p_updates->>'description' IS NOT NULL
     AND char_length(p_updates->>'description') > 100 THEN
    RAISE EXCEPTION 'Bulk update value exceeds the 100 character limit.';
  END IF;

  IF p_updates ? 'is_chomesh' AND jsonb_typeof(p_updates->'is_chomesh') <> 'boolean' THEN
    RAISE EXCEPTION 'Bulk chomesh update value must be a boolean.';
  END IF;

  SELECT
    count(*)::integer,
    count(DISTINCT input_id.id)::integer,
    bool_or(input_id.id IS NULL)
  INTO v_input_count, v_distinct_count, v_has_null_id
  FROM unnest(p_ids) AS input_id(id);

  IF coalesce(v_input_count, 0) = 0 THEN
    RAISE EXCEPTION 'Bulk update requires at least one transaction id.';
  END IF;

  IF coalesce(v_has_null_id, false) THEN
    RAISE EXCEPTION 'Bulk update transaction ids cannot contain null values.';
  END IF;

  IF v_distinct_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk update transaction ids cannot contain duplicates.';
  END IF;

  WITH locked_rows AS MATERIALIZED (
    SELECT transaction_row.id, transaction_row.type
    FROM public.transactions AS transaction_row
    WHERE transaction_row.user_id = p_user_id
      AND transaction_row.id = ANY(p_ids)
    ORDER BY transaction_row.id
    FOR UPDATE
  )
  SELECT
    count(*)::integer,
    bool_or(locked_rows.type = 'initial_balance'),
    bool_and(coalesce(locked_rows.type IN ('income', 'exempt-income'), false)),
    bool_and(coalesce(locked_rows.type IN ('expense', 'recognized-expense'), false)),
    bool_and(coalesce(locked_rows.type IN ('donation', 'non_tithe_donation'), false)),
    count(DISTINCT locked_rows.type)::integer,
    min(locked_rows.type)
  INTO
    v_locked_count,
    v_has_initial_balance,
    v_all_income_family,
    v_all_expense_family,
    v_all_recipient_family,
    v_distinct_types,
    v_shared_type
  FROM locked_rows;

  IF v_locked_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk update locked % transaction rows, expected %.', v_locked_count, v_input_count;
  END IF;

  IF coalesce(v_has_initial_balance, false) THEN
    RAISE EXCEPTION 'Bulk update cannot modify initial balance transactions.';
  END IF;

  IF p_updates ? 'category'
    AND NOT (coalesce(v_all_income_family, false) OR coalesce(v_all_expense_family, false)) THEN
    RAISE EXCEPTION 'Bulk category update requires all transactions to be in one income or expense family.';
  END IF;

  IF p_updates ? 'recipient' AND NOT coalesce(v_all_recipient_family, false) THEN
    RAISE EXCEPTION 'Bulk recipient update requires all transactions to be donations.';
  END IF;

  IF p_updates ? 'is_chomesh'
     AND (
       coalesce(v_distinct_types, 0) <> 1
       OR coalesce(v_shared_type, '') NOT IN ('income', 'donation', 'recognized-expense')
     ) THEN
    RAISE EXCEPTION 'Bulk chomesh update requires every transaction to have the same allowed type.';
  END IF;

  WITH updated_rows AS (
    UPDATE public.transactions AS transaction_row
    SET
      payment_method = CASE
        WHEN p_updates ? 'payment_method' THEN p_updates->>'payment_method'
        ELSE transaction_row.payment_method
      END,
      category = CASE
        WHEN p_updates ? 'category' THEN p_updates->>'category'
        ELSE transaction_row.category
      END,
      description = CASE
        WHEN p_updates ? 'description' THEN p_updates->>'description'
        ELSE transaction_row.description
      END,
      recipient = CASE
        WHEN p_updates ? 'recipient' THEN p_updates->>'recipient'
        ELSE transaction_row.recipient
      END,
      is_chomesh = CASE
        WHEN p_updates ? 'is_chomesh' THEN (p_updates->>'is_chomesh')::boolean
        ELSE transaction_row.is_chomesh
      END,
      updated_at = now()
    WHERE transaction_row.user_id = p_user_id
      AND transaction_row.id = ANY(p_ids)
    RETURNING 1
  )
  SELECT count(*)::integer
  INTO v_affected_count
  FROM updated_rows;

  IF v_affected_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk update affected % transaction rows, expected %.', v_affected_count, v_input_count;
  END IF;

  RETURN v_affected_count;
END;
$$;

CREATE FUNCTION public.bulk_update_user_recurring_transactions(
  p_user_id uuid,
  p_ids uuid[],
  p_updates jsonb
)
RETURNS integer
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_input_count integer;
  v_distinct_count integer;
  v_has_null_id boolean;
  v_locked_count integer;
  v_affected_count integer;
  v_has_completed boolean;
  v_all_income_family boolean;
  v_all_expense_family boolean;
  v_all_recipient_family boolean;
  v_distinct_types integer;
  v_shared_type text;
  v_unknown_key text;
BEGIN
  IF coalesce(auth.role(), '') <> 'service_role'
     AND auth.uid() IS DISTINCT FROM p_user_id THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  IF p_updates IS NULL OR jsonb_typeof(p_updates) <> 'object' OR p_updates = '{}'::jsonb THEN
    RAISE EXCEPTION 'Bulk update requires at least one field.';
  END IF;

  SELECT object_key
  INTO v_unknown_key
  FROM jsonb_object_keys(p_updates) AS keys(object_key)
  WHERE object_key NOT IN ('payment_method', 'category', 'description', 'recipient', 'is_chomesh')
  LIMIT 1;

  IF v_unknown_key IS NOT NULL THEN
    RAISE EXCEPTION 'Unsupported recurring transaction bulk update field: %.', v_unknown_key;
  END IF;

  IF p_updates ? 'payment_method'
     AND jsonb_typeof(p_updates->'payment_method') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Bulk update field payment_method must be a string or null.';
  END IF;

  IF p_updates ? 'category'
     AND jsonb_typeof(p_updates->'category') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Bulk update field category must be a string or null.';
  END IF;

  IF p_updates ? 'recipient'
     AND jsonb_typeof(p_updates->'recipient') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Bulk update field recipient must be a string or null.';
  END IF;

  IF p_updates ? 'description'
     AND jsonb_typeof(p_updates->'description') NOT IN ('string', 'null') THEN
    RAISE EXCEPTION 'Bulk update field description must be a string or null.';
  END IF;

  IF p_updates ? 'payment_method'
     AND p_updates->>'payment_method' IS NOT NULL
     AND char_length(p_updates->>'payment_method') > 50 THEN
    RAISE EXCEPTION 'Bulk update value exceeds the 50 character limit.';
  END IF;

  IF p_updates ? 'category'
     AND p_updates->>'category' IS NOT NULL
     AND char_length(p_updates->>'category') > 50 THEN
    RAISE EXCEPTION 'Bulk update value exceeds the 50 character limit.';
  END IF;

  IF p_updates ? 'recipient'
     AND p_updates->>'recipient' IS NOT NULL
     AND char_length(p_updates->>'recipient') > 50 THEN
    RAISE EXCEPTION 'Bulk update value exceeds the 50 character limit.';
  END IF;

  IF p_updates ? 'description'
     AND p_updates->>'description' IS NOT NULL
     AND char_length(p_updates->>'description') > 100 THEN
    RAISE EXCEPTION 'Bulk update value exceeds the 100 character limit.';
  END IF;

  IF p_updates ? 'is_chomesh' AND jsonb_typeof(p_updates->'is_chomesh') <> 'boolean' THEN
    RAISE EXCEPTION 'Bulk chomesh update value must be a boolean.';
  END IF;

  SELECT
    count(*)::integer,
    count(DISTINCT input_id.id)::integer,
    bool_or(input_id.id IS NULL)
  INTO v_input_count, v_distinct_count, v_has_null_id
  FROM unnest(p_ids) AS input_id(id);

  IF coalesce(v_input_count, 0) = 0 THEN
    RAISE EXCEPTION 'Bulk update requires at least one recurring transaction id.';
  END IF;

  IF coalesce(v_has_null_id, false) THEN
    RAISE EXCEPTION 'Bulk update recurring transaction ids cannot contain null values.';
  END IF;

  IF v_distinct_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk update recurring transaction ids cannot contain duplicates.';
  END IF;

  WITH locked_rows AS MATERIALIZED (
    SELECT recurring_row.id, recurring_row.type, recurring_row.status
    FROM public.recurring_transactions AS recurring_row
    WHERE recurring_row.user_id = p_user_id
      AND recurring_row.id = ANY(p_ids)
    ORDER BY recurring_row.id
    FOR UPDATE
  )
  SELECT
    count(*)::integer,
    bool_or(locked_rows.status = 'completed'),
    bool_and(coalesce(locked_rows.type IN ('income', 'exempt-income'), false)),
    bool_and(coalesce(locked_rows.type IN ('expense', 'recognized-expense'), false)),
    bool_and(coalesce(locked_rows.type IN ('donation', 'non_tithe_donation'), false)),
    count(DISTINCT locked_rows.type)::integer,
    min(locked_rows.type)
  INTO
    v_locked_count,
    v_has_completed,
    v_all_income_family,
    v_all_expense_family,
    v_all_recipient_family,
    v_distinct_types,
    v_shared_type
  FROM locked_rows;

  IF v_locked_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk update locked % recurring transaction rows, expected %.', v_locked_count, v_input_count;
  END IF;

  IF coalesce(v_has_completed, false) THEN
    RAISE EXCEPTION 'Bulk update cannot modify completed recurring transactions.';
  END IF;

  IF p_updates ? 'category'
    AND NOT (coalesce(v_all_income_family, false) OR coalesce(v_all_expense_family, false)) THEN
    RAISE EXCEPTION 'Bulk category update requires all recurring transactions to be in one income or expense family.';
  END IF;

  IF p_updates ? 'recipient' AND NOT coalesce(v_all_recipient_family, false) THEN
    RAISE EXCEPTION 'Bulk recipient update requires all recurring transactions to be donations.';
  END IF;

  IF p_updates ? 'is_chomesh'
     AND (
       coalesce(v_distinct_types, 0) <> 1
       OR coalesce(v_shared_type, '') NOT IN ('income', 'donation', 'recognized-expense')
     ) THEN
    RAISE EXCEPTION 'Bulk chomesh update requires every recurring transaction to have the same allowed type.';
  END IF;

  WITH updated_rows AS (
    UPDATE public.recurring_transactions AS recurring_row
    SET
      payment_method = CASE
        WHEN p_updates ? 'payment_method' THEN p_updates->>'payment_method'
        ELSE recurring_row.payment_method
      END,
      category = CASE
        WHEN p_updates ? 'category' THEN p_updates->>'category'
        ELSE recurring_row.category
      END,
      description = CASE
        WHEN p_updates ? 'description' THEN p_updates->>'description'
        ELSE recurring_row.description
      END,
      recipient = CASE
        WHEN p_updates ? 'recipient' THEN p_updates->>'recipient'
        ELSE recurring_row.recipient
      END,
      is_chomesh = CASE
        WHEN p_updates ? 'is_chomesh' THEN (p_updates->>'is_chomesh')::boolean
        ELSE recurring_row.is_chomesh
      END,
      updated_at = now()
    WHERE recurring_row.user_id = p_user_id
      AND recurring_row.id = ANY(p_ids)
    RETURNING 1
  )
  SELECT count(*)::integer
  INTO v_affected_count
  FROM updated_rows;

  IF v_affected_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk update affected % recurring transaction rows, expected %.', v_affected_count, v_input_count;
  END IF;

  RETURN v_affected_count;
END;
$$;

ALTER FUNCTION public.bulk_update_user_transactions(uuid, uuid[], jsonb)
  OWNER TO postgres;
ALTER FUNCTION public.bulk_update_user_recurring_transactions(uuid, uuid[], jsonb)
  OWNER TO postgres;

REVOKE EXECUTE ON FUNCTION public.bulk_update_user_transactions(uuid, uuid[], jsonb)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.bulk_update_user_recurring_transactions(uuid, uuid[], jsonb)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.bulk_update_user_transactions(uuid, uuid[], jsonb)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bulk_update_user_recurring_transactions(uuid, uuid[], jsonb)
  TO authenticated, service_role;

DO $postconditions$
DECLARE
  function_oid oid;
  function_def text;
  function_owner text;
  execute_grantees text[];
  required_signature text;
  legacy_signatures constant text[] := ARRAY[
    'public.bulk_update_user_transactions(uuid,uuid[],text,text)',
    'public.bulk_update_user_recurring_transactions(uuid,uuid[],text,text)'
  ];
  required_signatures constant text[] := ARRAY[
    'public.bulk_update_user_transactions(uuid,uuid[],jsonb)',
    'public.bulk_update_user_recurring_transactions(uuid,uuid[],jsonb)'
  ];
BEGIN
  FOREACH required_signature IN ARRAY legacy_signatures LOOP
    function_oid := to_regprocedure(required_signature);

    IF function_oid IS NULL THEN
      RAISE EXCEPTION 'Legacy single-field bulk updater is missing after additive jsonb migration: %', required_signature;
    END IF;

    SELECT pg_get_functiondef(function_oid)
    INTO function_def;

    IF function_def !~* $allowed_fields_regex$p_field[[:space:]]+NOT[[:space:]]+IN[[:space:]]*\([[:space:]]*'payment_method'[[:space:]]*,[[:space:]]*'category'[[:space:]]*\)$allowed_fields_regex$
       OR function_def ~* $status_update_regex$SET[[:space:]]+status[[:space:]]*=$status_update_regex$ THEN
      RAISE EXCEPTION 'Legacy bulk updater lost its field allowlist: %', required_signature;
    END IF;
  END LOOP;

  FOREACH required_signature IN ARRAY required_signatures LOOP
    function_oid := to_regprocedure(required_signature);

    IF function_oid IS NULL THEN
      RAISE EXCEPTION 'Required function is missing after jsonb patch migration: %', required_signature;
    END IF;

    SELECT pg_get_functiondef(function_oid)
    INTO function_def;

    SELECT pg_get_userbyid(pg_proc.proowner)
    INTO function_owner
    FROM pg_proc
    WHERE pg_proc.oid = function_oid;

    IF function_owner IS DISTINCT FROM 'postgres' THEN
      RAISE EXCEPTION 'Function owner is not postgres: % owned by %', required_signature, function_owner;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE pg_proc.oid = function_oid
        AND pg_proc.prosecdef
    ) THEN
      RAISE EXCEPTION 'Function is SECURITY DEFINER: %', required_signature;
    END IF;

    IF function_def !~* $length_guard_regex$char_length[[:space:]]*\([[:space:]]*p_updates->>'description'[[:space:]]*\)[[:space:]]*>[[:space:]]*100$length_guard_regex$ THEN
      RAISE EXCEPTION 'Function is missing the 100-character description limit: %', required_signature;
    END IF;

    IF function_def !~* $auth_guard_regex$coalesce[[:space:]]*\([[:space:]]*auth\.role\(\)[[:space:]]*,[[:space:]]*''[[:space:]]*\)[[:space:]]*<>[[:space:]]*'service_role'[[:space:]]+AND[[:space:]]+auth\.uid\(\)[[:space:]]+IS[[:space:]]+DISTINCT[[:space:]]+FROM[[:space:]]+p_user_id$auth_guard_regex$ THEN
      RAISE EXCEPTION 'Function is missing the NULL-safe ownership guard: %', required_signature;
    END IF;

    IF function_def ~* $status_update_regex$SET[[:space:]]+status[[:space:]]*=$status_update_regex$ THEN
      RAISE EXCEPTION 'Bulk update still permits status editing: %', required_signature;
    END IF;

    IF has_function_privilege('anon', function_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon can execute: %', required_signature;
    END IF;

    SELECT coalesce(array_agg(granted_role.rolname ORDER BY granted_role.rolname), ARRAY[]::name[])::text[]
    INTO execute_grantees
    FROM (
      SELECT DISTINCT function_acl.grantee
      FROM pg_proc
      CROSS JOIN LATERAL aclexplode(coalesce(pg_proc.proacl, acldefault('f', pg_proc.proowner))) AS function_acl
      WHERE pg_proc.oid = function_oid
        AND function_acl.grantee <> 0
        AND function_acl.grantee <> pg_proc.proowner
        AND function_acl.privilege_type = 'EXECUTE'
    ) AS execute_acl
    JOIN pg_roles AS granted_role
      ON granted_role.oid = execute_acl.grantee;

    IF execute_grantees IS DISTINCT FROM ARRAY['authenticated', 'service_role']::text[] THEN
      RAISE EXCEPTION 'Unexpected EXECUTE grants for %: %', required_signature, execute_grantees;
    END IF;
  END LOOP;
END;
$postconditions$;
