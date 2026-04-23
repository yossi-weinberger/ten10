-- Fix update_recurring_transaction RPC to include currency conversion parameters
-- This function was missing from migrations and had an incomplete signature in production

-- Drop the old version of the function if it exists (to handle signature changes)
DROP FUNCTION IF EXISTS update_recurring_transaction(
    UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT
);

-- Drop the new version if it exists (for idempotency)
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
RETURNS TABLE (
    id UUID,
    user_id UUID,
    status TEXT,
    start_date TEXT,
    next_due_date TEXT,
    frequency TEXT,
    day_of_month INTEGER,
    total_occurrences INTEGER,
    execution_count INTEGER,
    description TEXT,
    amount NUMERIC,
    currency TEXT,
    type TEXT,
    category TEXT,
    is_chomesh BOOLEAN,
    recipient TEXT,
    payment_method TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    original_amount NUMERIC,
    original_currency TEXT,
    conversion_rate NUMERIC,
    conversion_date DATE,
    rate_source TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Update the recurring transaction with all provided fields
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
    WHERE id = p_id AND user_id = p_user_id;

    -- Return the updated row
    RETURN QUERY
    SELECT
        rt.id,
        rt.user_id,
        rt.status,
        rt.start_date::TEXT,
        rt.next_due_date::TEXT,
        rt.frequency,
        rt.day_of_month,
        rt.total_occurrences,
        rt.execution_count,
        rt.description,
        rt.amount,
        rt.currency,
        rt.type,
        rt.category,
        rt.is_chomesh,
        rt.recipient,
        rt.payment_method,
        rt.created_at,
        rt.updated_at,
        rt.original_amount,
        rt.original_currency,
        rt.conversion_rate,
        rt.conversion_date,
        rt.rate_source
    FROM recurring_transactions rt
    WHERE rt.id = p_id AND rt.user_id = p_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_recurring_transaction(
    UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT,
    NUMERIC, TEXT, NUMERIC, DATE, TEXT
) TO authenticated;
