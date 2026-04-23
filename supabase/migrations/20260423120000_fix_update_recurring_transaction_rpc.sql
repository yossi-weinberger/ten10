-- Fix update_recurring_transaction RPC to include currency conversion parameters
-- Uses RETURNS SETOF to avoid column name ambiguity with OUT parameters

-- Drop old versions if they exist (handle signature changes)
DROP FUNCTION IF EXISTS update_recurring_transaction(
    UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT
);

DROP FUNCTION IF EXISTS update_recurring_transaction(
    UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT,
    NUMERIC, TEXT, NUMERIC, DATE, TEXT
);

CREATE OR REPLACE FUNCTION update_recurring_transaction(
    p_id UUID,
    p_user_id UUID,
    p_amount NUMERIC,
    p_currency TEXT,
    p_description TEXT,
    p_status TEXT,
    p_total_occurrences INTEGER,
    p_day_of_month INTEGER,
    p_payment_method TEXT,
    p_original_amount NUMERIC,
    p_original_currency TEXT,
    p_conversion_rate NUMERIC,
    p_conversion_date DATE,
    p_rate_source TEXT
)
RETURNS SETOF recurring_transactions
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    UPDATE recurring_transactions
    SET
        amount = p_amount,
        currency = p_currency,
        description = p_description,
        status = p_status,
        total_occurrences = p_total_occurrences,
        day_of_month = p_day_of_month,
        payment_method = p_payment_method,
        original_amount = p_original_amount,
        original_currency = p_original_currency,
        conversion_rate = p_conversion_rate,
        conversion_date = p_conversion_date,
        rate_source = p_rate_source,
        updated_at = NOW()
    WHERE recurring_transactions.id = p_id
      AND recurring_transactions.user_id = p_user_id
    RETURNING *;
END;
$$;

GRANT EXECUTE ON FUNCTION update_recurring_transaction(
    UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT,
    NUMERIC, TEXT, NUMERIC, DATE, TEXT
) TO authenticated;

GRANT EXECUTE ON FUNCTION update_recurring_transaction(
    UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT,
    NUMERIC, TEXT, NUMERIC, DATE, TEXT
) TO service_role;
