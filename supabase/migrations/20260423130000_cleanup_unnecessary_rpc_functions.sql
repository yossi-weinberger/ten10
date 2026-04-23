-- Cleanup: drop RPC functions that were created unnecessarily during debugging
-- edit_recurring_transaction and update_recurring_v2 were created on production
-- by mistake and are not used anywhere in the codebase.
-- The correct function to use is update_recurring_transaction.

DROP FUNCTION IF EXISTS edit_recurring_transaction(
    UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT,
    NUMERIC, TEXT, NUMERIC, DATE, TEXT
);

DROP FUNCTION IF EXISTS update_recurring_v2(
    UUID, UUID, NUMERIC, TEXT, TEXT, TEXT, INTEGER, INTEGER, TEXT,
    NUMERIC, TEXT, NUMERIC, DATE, TEXT
);
