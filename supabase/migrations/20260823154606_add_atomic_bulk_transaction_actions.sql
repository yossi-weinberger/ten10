-- Add atomic bulk transaction actions for the table bulk-action UI.
-- These functions intentionally remain SECURITY INVOKER so table RLS is
-- authoritative for authenticated callers.

DO $preconditions$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint AS constraint_row
    JOIN pg_class AS source_table
      ON source_table.oid = constraint_row.conrelid
    JOIN pg_namespace AS source_namespace
      ON source_namespace.oid = source_table.relnamespace
    JOIN pg_attribute AS source_column
      ON source_column.attrelid = source_table.oid
      AND source_column.attname = 'source_recurring_id'
      AND NOT source_column.attisdropped
    JOIN pg_class AS target_table
      ON target_table.oid = constraint_row.confrelid
    JOIN pg_namespace AS target_namespace
      ON target_namespace.oid = target_table.relnamespace
    JOIN pg_attribute AS target_column
      ON target_column.attrelid = target_table.oid
      AND target_column.attname = 'id'
      AND NOT target_column.attisdropped
    WHERE constraint_row.contype = 'f'
      AND source_namespace.nspname = 'public'
      AND source_table.relname = 'transactions'
      AND target_namespace.nspname = 'public'
      AND target_table.relname = 'recurring_transactions'
      AND constraint_row.conkey = ARRAY[source_column.attnum]
      AND constraint_row.confkey = ARRAY[target_column.attnum]
      AND constraint_row.confdeltype = 'n'
  ) THEN
    RAISE EXCEPTION 'Expected FK public.transactions(source_recurring_id) -> public.recurring_transactions(id) ON DELETE SET NULL is missing.';
  END IF;
END;
$preconditions$;

CREATE OR REPLACE FUNCTION public.bulk_delete_user_transactions(
  p_user_id uuid,
  p_ids uuid[]
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
BEGIN
  SELECT
    count(*)::integer,
    count(DISTINCT input_id.id)::integer,
    bool_or(input_id.id IS NULL)
  INTO v_input_count, v_distinct_count, v_has_null_id
  FROM unnest(p_ids) AS input_id(id);

  IF coalesce(v_input_count, 0) = 0 THEN
    RAISE EXCEPTION 'Bulk delete requires at least one transaction id.';
  END IF;

  IF coalesce(v_has_null_id, false) THEN
    RAISE EXCEPTION 'Bulk delete transaction ids cannot contain null values.';
  END IF;

  IF v_distinct_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk delete transaction ids cannot contain duplicates.';
  END IF;

  WITH locked_rows AS (
    SELECT transaction_row.id
    FROM public.transactions AS transaction_row
    WHERE transaction_row.user_id = p_user_id
      AND transaction_row.id = ANY(p_ids)
    FOR UPDATE
  )
  SELECT count(*)::integer
  INTO v_locked_count
  FROM locked_rows;

  IF v_locked_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk delete locked % transaction rows, expected %.', v_locked_count, v_input_count;
  END IF;

  WITH deleted_rows AS (
    DELETE FROM public.transactions AS transaction_row
    WHERE transaction_row.user_id = p_user_id
      AND transaction_row.id = ANY(p_ids)
    RETURNING 1
  )
  SELECT count(*)::integer
  INTO v_affected_count
  FROM deleted_rows;

  IF v_affected_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk delete affected % transaction rows, expected %.', v_affected_count, v_input_count;
  END IF;

  RETURN v_affected_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_update_user_transactions(
  p_user_id uuid,
  p_ids uuid[],
  p_field text,
  p_value text
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
BEGIN
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

  IF p_field IS NULL OR p_field NOT IN ('payment_method', 'category') THEN
    RAISE EXCEPTION 'Unsupported transaction bulk update field: %.', p_field;
  END IF;

  WITH locked_rows AS (
    SELECT transaction_row.id, transaction_row.type
    FROM public.transactions AS transaction_row
    WHERE transaction_row.user_id = p_user_id
      AND transaction_row.id = ANY(p_ids)
    FOR UPDATE
  )
  SELECT
    count(*)::integer,
    bool_or(locked_rows.type = 'initial_balance'),
    bool_and(coalesce(locked_rows.type IN ('income', 'exempt-income'), false)),
    bool_and(coalesce(locked_rows.type IN ('expense', 'recognized-expense'), false))
  INTO v_locked_count, v_has_initial_balance, v_all_income_family, v_all_expense_family
  FROM locked_rows;

  IF v_locked_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk update locked % transaction rows, expected %.', v_locked_count, v_input_count;
  END IF;

  IF coalesce(v_has_initial_balance, false) THEN
    RAISE EXCEPTION 'Bulk update cannot modify initial balance transactions.';
  END IF;

  IF p_field = 'category'
    AND NOT (coalesce(v_all_income_family, false) OR coalesce(v_all_expense_family, false)) THEN
    RAISE EXCEPTION 'Bulk category update requires all transactions to be in one income or expense family.';
  END IF;

  IF p_field = 'payment_method' THEN
    WITH updated_rows AS (
      UPDATE public.transactions AS transaction_row
      SET payment_method = p_value,
          updated_at = now()
      WHERE transaction_row.user_id = p_user_id
        AND transaction_row.id = ANY(p_ids)
      RETURNING 1
    )
    SELECT count(*)::integer
    INTO v_affected_count
    FROM updated_rows;
  ELSIF p_field = 'category' THEN
    WITH updated_rows AS (
      UPDATE public.transactions AS transaction_row
      SET category = p_value,
          updated_at = now()
      WHERE transaction_row.user_id = p_user_id
        AND transaction_row.id = ANY(p_ids)
      RETURNING 1
    )
    SELECT count(*)::integer
    INTO v_affected_count
    FROM updated_rows;
  END IF;

  IF v_affected_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk update affected % transaction rows, expected %.', v_affected_count, v_input_count;
  END IF;

  RETURN v_affected_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_delete_user_recurring_transactions(
  p_user_id uuid,
  p_ids uuid[]
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
BEGIN
  SELECT
    count(*)::integer,
    count(DISTINCT input_id.id)::integer,
    bool_or(input_id.id IS NULL)
  INTO v_input_count, v_distinct_count, v_has_null_id
  FROM unnest(p_ids) AS input_id(id);

  IF coalesce(v_input_count, 0) = 0 THEN
    RAISE EXCEPTION 'Bulk delete requires at least one recurring transaction id.';
  END IF;

  IF coalesce(v_has_null_id, false) THEN
    RAISE EXCEPTION 'Bulk delete recurring transaction ids cannot contain null values.';
  END IF;

  IF v_distinct_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk delete recurring transaction ids cannot contain duplicates.';
  END IF;

  WITH locked_rows AS (
    SELECT recurring_row.id
    FROM public.recurring_transactions AS recurring_row
    WHERE recurring_row.user_id = p_user_id
      AND recurring_row.id = ANY(p_ids)
    FOR UPDATE
  )
  SELECT count(*)::integer
  INTO v_locked_count
  FROM locked_rows;

  IF v_locked_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk delete locked % recurring transaction rows, expected %.', v_locked_count, v_input_count;
  END IF;

  WITH deleted_rows AS (
    DELETE FROM public.recurring_transactions AS recurring_row
    WHERE recurring_row.user_id = p_user_id
      AND recurring_row.id = ANY(p_ids)
    RETURNING 1
  )
  SELECT count(*)::integer
  INTO v_affected_count
  FROM deleted_rows;

  IF v_affected_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk delete affected % recurring transaction rows, expected %.', v_affected_count, v_input_count;
  END IF;

  RETURN v_affected_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.bulk_update_user_recurring_transactions(
  p_user_id uuid,
  p_ids uuid[],
  p_field text,
  p_value text
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
BEGIN
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

  IF p_field IS NULL OR p_field NOT IN ('status', 'payment_method', 'category') THEN
    RAISE EXCEPTION 'Unsupported recurring transaction bulk update field: %.', p_field;
  END IF;

  IF p_field = 'status' AND p_value IS NULL THEN
    RAISE EXCEPTION 'Recurring transaction bulk status update value cannot be null.';
  END IF;

  IF p_field = 'status' AND p_value NOT IN ('active', 'paused', 'cancelled') THEN
    RAISE EXCEPTION 'Unsupported recurring transaction bulk status value: %.', p_value;
  END IF;

  WITH locked_rows AS (
    SELECT recurring_row.id, recurring_row.type, recurring_row.status
    FROM public.recurring_transactions AS recurring_row
    WHERE recurring_row.user_id = p_user_id
      AND recurring_row.id = ANY(p_ids)
    FOR UPDATE
  )
  SELECT
    count(*)::integer,
    bool_or(locked_rows.status = 'completed'),
    bool_and(coalesce(locked_rows.type IN ('income', 'exempt-income'), false)),
    bool_and(coalesce(locked_rows.type IN ('expense', 'recognized-expense'), false))
  INTO v_locked_count, v_has_completed, v_all_income_family, v_all_expense_family
  FROM locked_rows;

  IF v_locked_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk update locked % recurring transaction rows, expected %.', v_locked_count, v_input_count;
  END IF;

  IF coalesce(v_has_completed, false) THEN
    RAISE EXCEPTION 'Bulk update cannot modify completed recurring transactions.';
  END IF;

  IF p_field = 'category'
    AND NOT (coalesce(v_all_income_family, false) OR coalesce(v_all_expense_family, false)) THEN
    RAISE EXCEPTION 'Bulk category update requires all recurring transactions to be in one income or expense family.';
  END IF;

  IF p_field = 'status' THEN
    WITH updated_rows AS (
      UPDATE public.recurring_transactions AS recurring_row
      SET status = p_value,
          updated_at = now()
      WHERE recurring_row.user_id = p_user_id
        AND recurring_row.id = ANY(p_ids)
      RETURNING 1
    )
    SELECT count(*)::integer
    INTO v_affected_count
    FROM updated_rows;
  ELSIF p_field = 'payment_method' THEN
    WITH updated_rows AS (
      UPDATE public.recurring_transactions AS recurring_row
      SET payment_method = p_value,
          updated_at = now()
      WHERE recurring_row.user_id = p_user_id
        AND recurring_row.id = ANY(p_ids)
      RETURNING 1
    )
    SELECT count(*)::integer
    INTO v_affected_count
    FROM updated_rows;
  ELSIF p_field = 'category' THEN
    WITH updated_rows AS (
      UPDATE public.recurring_transactions AS recurring_row
      SET category = p_value,
          updated_at = now()
      WHERE recurring_row.user_id = p_user_id
        AND recurring_row.id = ANY(p_ids)
      RETURNING 1
    )
    SELECT count(*)::integer
    INTO v_affected_count
    FROM updated_rows;
  END IF;

  IF v_affected_count <> v_input_count THEN
    RAISE EXCEPTION 'Bulk update affected % recurring transaction rows, expected %.', v_affected_count, v_input_count;
  END IF;

  RETURN v_affected_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.bulk_delete_user_transactions(uuid, uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.bulk_update_user_transactions(uuid, uuid[], text, text)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.bulk_delete_user_recurring_transactions(uuid, uuid[])
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.bulk_update_user_recurring_transactions(uuid, uuid[], text, text)
  FROM PUBLIC, anon, authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.bulk_delete_user_transactions(uuid, uuid[])
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bulk_update_user_transactions(uuid, uuid[], text, text)
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bulk_delete_user_recurring_transactions(uuid, uuid[])
  TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.bulk_update_user_recurring_transactions(uuid, uuid[], text, text)
  TO authenticated, service_role;

DO $postconditions$
DECLARE
  function_oid oid;
  required_signature text;
  required_signatures constant text[] := ARRAY[
    'public.bulk_delete_user_transactions(uuid,uuid[])',
    'public.bulk_update_user_transactions(uuid,uuid[],text,text)',
    'public.bulk_delete_user_recurring_transactions(uuid,uuid[])',
    'public.bulk_update_user_recurring_transactions(uuid,uuid[],text,text)'
  ];
BEGIN
  FOREACH required_signature IN ARRAY required_signatures LOOP
    function_oid := to_regprocedure(required_signature);

    IF function_oid IS NULL THEN
      RAISE EXCEPTION 'Required function is missing: %', required_signature;
    END IF;

    IF EXISTS (
      SELECT 1 FROM pg_proc WHERE oid = function_oid AND prosecdef
    ) THEN
      RAISE EXCEPTION 'Function is still SECURITY DEFINER: %', required_signature;
    END IF;

    IF NOT EXISTS (
      SELECT 1
      FROM pg_proc
      WHERE pg_proc.oid = function_oid
        AND EXISTS (
          SELECT 1
          FROM unnest(coalesce(pg_proc.proconfig, ARRAY[]::text[])) AS setting(value)
          WHERE split_part(setting.value, '=', 1) = 'search_path'
            AND replace(replace(split_part(setting.value, '=', 2), '"', ''), '''', '') = ''
        )
        AND pg_get_functiondef(function_oid) ~ $search_path_regex$SET[[:space:]]+search_path[[:space:]]+(=|TO)[[:space:]]+''$search_path_regex$
    ) THEN
      RAISE EXCEPTION 'Function does not have explicit empty search_path: %', required_signature;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM pg_proc
      CROSS JOIN LATERAL aclexplode(coalesce(pg_proc.proacl, acldefault('f', pg_proc.proowner))) AS function_acl
      WHERE pg_proc.oid = function_oid
        AND function_acl.grantee = 0
        AND function_acl.privilege_type = 'EXECUTE'
    ) THEN
      RAISE EXCEPTION 'PUBLIC can still execute: %', required_signature;
    END IF;

    IF has_function_privilege('anon', function_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon can still execute: %', required_signature;
    END IF;

    IF NOT has_function_privilege('authenticated', function_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated cannot execute: %', required_signature;
    END IF;

    IF NOT has_function_privilege('service_role', function_oid, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role cannot execute: %', required_signature;
    END IF;
  END LOOP;
END;
$postconditions$;
