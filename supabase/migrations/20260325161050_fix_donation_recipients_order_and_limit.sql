-- Fix donation recipients: increase LIMIT from 10 to 50 (keep ORDER BY SUM(amount) DESC).
-- Previously LIMIT 10 hid new small-amount donations when there are many historical groups.

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
    grp.display_key AS recipient,
    grp.total_amount,
    grp.display_key AS last_description
  FROM (
    SELECT
      COALESCE(NULLIF(TRIM(description), ''), NULLIF(TRIM(recipient), ''), 'other') AS display_key,
      SUM(amount) AS total_amount
    FROM transactions
    WHERE user_id = auth.uid()
      AND date BETWEEN p_start_date::date AND p_end_date::date
      AND type IN ('donation', 'non_tithe_donation')
    GROUP BY COALESCE(NULLIF(TRIM(description), ''), NULLIF(TRIM(recipient), ''), 'other')
    ORDER BY SUM(amount) DESC
    LIMIT 50
  ) grp
  ORDER BY grp.total_amount DESC;
$$;
