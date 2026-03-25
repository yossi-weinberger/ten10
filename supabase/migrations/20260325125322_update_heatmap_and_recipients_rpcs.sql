-- Update 1: Add p_type_group filter to heatmap RPC
-- Default 'all' keeps backward compatibility
CREATE OR REPLACE FUNCTION get_daily_transaction_heatmap(
  p_start_date  text,
  p_end_date    text,
  p_type_group  text DEFAULT 'all'
)
RETURNS TABLE(
  tx_date      text,
  tx_count     integer,
  total_amount numeric
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    date::text         AS tx_date,
    COUNT(*)::integer  AS tx_count,
    SUM(amount)        AS total_amount
  FROM transactions
  WHERE user_id = auth.uid()
    AND date BETWEEN p_start_date::date AND p_end_date::date
    AND type NOT IN ('initial_balance')
    AND (
      p_type_group = 'all'
      OR (p_type_group = 'income'   AND type IN ('income', 'exempt-income'))
      OR (p_type_group = 'expense'  AND type IN ('expense', 'recognized-expense'))
      OR (p_type_group = 'donation' AND type IN ('donation', 'non_tithe_donation'))
    )
  GROUP BY date
  ORDER BY date;
$$;

-- Update 2: Add last_description to donation recipients breakdown
-- Uses LATERAL join to safely get the most recent description per recipient group
DROP FUNCTION IF EXISTS get_donation_recipients_breakdown(text, text);

CREATE OR REPLACE FUNCTION get_donation_recipients_breakdown(
  p_start_date text,
  p_end_date   text
)
RETURNS TABLE(recipient text, total_amount numeric, last_description text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    grp.recipient,
    grp.total_amount,
    latest.last_description
  FROM (
    SELECT
      COALESCE(recipient, 'other') AS recipient,
      SUM(amount)                   AS total_amount
    FROM transactions
    WHERE user_id = auth.uid()
      AND date BETWEEN p_start_date::date AND p_end_date::date
      AND type IN ('donation', 'non_tithe_donation')
    GROUP BY COALESCE(recipient, 'other')
    ORDER BY SUM(amount) DESC
    LIMIT 10
  ) grp
  LEFT JOIN LATERAL (
    SELECT description AS last_description
    FROM transactions t2
    WHERE t2.user_id = auth.uid()
      AND t2.type IN ('donation', 'non_tithe_donation')
      AND COALESCE(t2.recipient, 'other') = grp.recipient
      AND t2.description IS NOT NULL
      AND t2.description <> ''
    ORDER BY t2.date DESC
    LIMIT 1
  ) latest ON true
  ORDER BY grp.total_amount DESC;
$$;
