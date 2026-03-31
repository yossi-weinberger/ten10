-- Cleanup: drop analytics RPCs that are no longer called by the app.
-- All were superseded when get_analytics_breakdowns consolidated them into one round-trip.
-- The 2-param heatmap overload was orphaned when a 3-param version was added in a later migration.

-- Individual breakdowns replaced by get_analytics_breakdowns
DROP FUNCTION IF EXISTS get_payment_method_breakdown(text, text);
DROP FUNCTION IF EXISTS get_recurring_vs_onetime(text, text);
DROP FUNCTION IF EXISTS get_donation_recipients_breakdown(text, text);

-- Recurring forecast RPC — never wired up in the frontend service layer
DROP FUNCTION IF EXISTS get_recurring_forecast();

-- Orphaned 2-param heatmap overload (superseded by the 3-param version with p_type_group)
DROP FUNCTION IF EXISTS get_daily_transaction_heatmap(text, text);
