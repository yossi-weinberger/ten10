-- Make all-time ranges unbounded: a NULL start date skips the lower bound.
-- Signatures stay (text, text) so existing callers can pass NULL without a new overload.

CREATE OR REPLACE FUNCTION public.get_analytics_range_stats(
  p_start_date text,
  p_end_date text
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH range_data AS (
    SELECT amount, type, is_chomesh
    FROM public.transactions
    WHERE user_id = auth.uid()
      AND (p_start_date IS NULL OR date >= p_start_date::date)
      AND (p_end_date IS NULL OR date <= p_end_date::date)
  )
  SELECT json_build_object(
    'total_income',              COALESCE(SUM(CASE WHEN type IN ('income', 'exempt-income')        THEN amount ELSE 0 END), 0),
    'titheable_income',          COALESCE(SUM(CASE WHEN type = 'income'                            THEN amount ELSE 0 END), 0),
    'chomesh_amount',            COALESCE(SUM(CASE WHEN is_chomesh = true                          THEN amount ELSE 0 END), 0),
    'total_expenses',            COALESCE(SUM(CASE WHEN type IN ('expense', 'recognized-expense')  THEN amount ELSE 0 END), 0),
    'total_donations',           COALESCE(SUM(CASE WHEN type IN ('donation', 'non_tithe_donation') THEN amount ELSE 0 END), 0),
    'non_tithe_donation_amount', COALESCE(SUM(CASE WHEN type = 'non_tithe_donation'               THEN amount ELSE 0 END), 0)
  )
  FROM range_data;
$$;

CREATE OR REPLACE FUNCTION public.get_analytics_breakdowns(
  p_start_date text,
  p_end_date   text
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT amount, type, payment_method, source_recurring_id, description, recipient
    FROM transactions
    WHERE user_id = auth.uid()
      AND (p_start_date IS NULL OR date >= p_start_date::date)
      AND (p_end_date IS NULL OR date <= p_end_date::date)
      AND type != 'initial_balance'
  )
  SELECT json_build_object(
    'payment_methods', (
      SELECT COALESCE(json_agg(r ORDER BY r.total_amount DESC), '[]'::json)
      FROM (
        SELECT COALESCE(payment_method, 'other') AS payment_method,
               SUM(amount) AS total_amount
        FROM base
        WHERE type IN ('expense', 'recognized-expense')
        GROUP BY COALESCE(payment_method, 'other')
        ORDER BY SUM(amount) DESC
        LIMIT 20
      ) r
    ),
    'recurring_vs_onetime', (
      SELECT COALESCE(json_agg(r), '[]'::json)
      FROM (
        SELECT (source_recurring_id IS NOT NULL) AS is_recurring,
               SUM(amount) AS total_amount,
               COUNT(*) AS tx_count
        FROM base
        GROUP BY (source_recurring_id IS NOT NULL)
      ) r
    ),
    'recipients', (
      SELECT COALESCE(json_agg(r ORDER BY r.total_amount DESC), '[]'::json)
      FROM (
        SELECT sub.display_key AS recipient,
               sub.total_amount,
               sub.display_key AS last_description
        FROM (
          SELECT
            COALESCE(NULLIF(TRIM(description), ''), NULLIF(TRIM(recipient), ''), 'other') AS display_key,
            SUM(amount) AS total_amount
          FROM base
          WHERE type IN ('donation', 'non_tithe_donation')
          GROUP BY COALESCE(NULLIF(TRIM(description), ''), NULLIF(TRIM(recipient), ''), 'other')
          ORDER BY SUM(amount) DESC
          LIMIT 50
        ) sub
        ORDER BY sub.total_amount DESC
      ) r
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.get_category_breakdown(
  p_start_date text,
  p_end_date   text,
  p_type       text DEFAULT 'expense'
)
RETURNS TABLE(category text, total_amount numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(t.category, 'other') AS category,
    SUM(t.amount)                 AS total_amount
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND (p_start_date IS NULL OR t.date >= p_start_date::date)
    AND (p_end_date IS NULL OR t.date <= p_end_date::date)
    AND t.type = ANY(
      CASE p_type
        WHEN 'expense'  THEN ARRAY['expense', 'recognized-expense']
        WHEN 'income'   THEN ARRAY['income', 'exempt-income']
        WHEN 'donation' THEN ARRAY['donation', 'non_tithe_donation']
        ELSE ARRAY[]::text[]
      END
    )
  GROUP BY COALESCE(t.category, 'other')
  ORDER BY SUM(t.amount) DESC
  LIMIT 10;
$$;

CREATE OR REPLACE FUNCTION public.get_daily_transaction_heatmap(
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
    AND (p_start_date IS NULL OR date >= p_start_date::date)
    AND (p_end_date IS NULL OR date <= p_end_date::date)
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

CREATE OR REPLACE FUNCTION public.get_donation_recipients_breakdown(
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
      AND (p_start_date IS NULL OR date >= p_start_date::date)
      AND (p_end_date IS NULL OR date <= p_end_date::date)
      AND type IN ('donation', 'non_tithe_donation')
    GROUP BY COALESCE(NULLIF(TRIM(description), ''), NULLIF(TRIM(recipient), ''), 'other')
    ORDER BY SUM(amount) DESC
    LIMIT 50
  ) grp
  ORDER BY grp.total_amount DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_payment_method_breakdown(
  p_start_date text,
  p_end_date   text
)
RETURNS TABLE(payment_method text, total_amount numeric)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE(t.payment_method, 'other') AS payment_method,
    SUM(t.amount)                        AS total_amount
  FROM transactions t
  WHERE t.user_id = auth.uid()
    AND (p_start_date IS NULL OR t.date >= p_start_date::date)
    AND (p_end_date IS NULL OR t.date <= p_end_date::date)
    AND t.type IN ('expense', 'recognized-expense')
  GROUP BY COALESCE(t.payment_method, 'other')
  ORDER BY SUM(t.amount) DESC
  LIMIT 20;
$$;

-- Legacy per-metric RPCs still used by stats.service / analytics.service.
-- Recreate the (uuid, text, text) overloads so a NULL start is unbounded.
DROP FUNCTION IF EXISTS public.get_total_income_and_chomesh_for_user(uuid, text, text);
CREATE FUNCTION public.get_total_income_and_chomesh_for_user(
  p_user_id uuid,
  p_start_date text,
  p_end_date text
)
RETURNS json
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT json_build_object(
    'total_income',   COALESCE(SUM(CASE WHEN type IN ('income', 'exempt-income') THEN amount ELSE 0 END), 0),
    'chomesh_amount', COALESCE(SUM(CASE WHEN is_chomesh = true THEN amount ELSE 0 END), 0)
  )
  FROM public.transactions
  WHERE user_id = p_user_id
    AND (auth.uid() = p_user_id OR coalesce(auth.role(), '') = 'service_role')
    AND (p_start_date IS NULL OR date >= p_start_date::date)
    AND (p_end_date IS NULL OR date <= p_end_date::date);
$$;

DROP FUNCTION IF EXISTS public.get_total_expenses_for_user(uuid, text, text);
CREATE FUNCTION public.get_total_expenses_for_user(
  p_user_id uuid,
  p_start_date text,
  p_end_date text
)
RETURNS double precision
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT COALESCE(SUM(amount), 0)::double precision
  FROM public.transactions
  WHERE user_id = p_user_id
    AND (auth.uid() = p_user_id OR coalesce(auth.role(), '') = 'service_role')
    AND type IN ('expense', 'recognized-expense')
    AND (p_start_date IS NULL OR date >= p_start_date::date)
    AND (p_end_date IS NULL OR date <= p_end_date::date);
$$;

DROP FUNCTION IF EXISTS public.get_total_donations_for_user(uuid, text, text);
CREATE FUNCTION public.get_total_donations_for_user(
  p_user_id uuid,
  p_start_date text,
  p_end_date text
)
RETURNS TABLE (
  total_donations_amount double precision,
  non_tithe_donation_amount double precision
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    COALESCE(SUM(CASE WHEN type IN ('donation', 'non_tithe_donation') THEN amount ELSE 0 END), 0)::double precision,
    COALESCE(SUM(CASE WHEN type = 'non_tithe_donation' THEN amount ELSE 0 END), 0)::double precision
  FROM public.transactions
  WHERE user_id = p_user_id
    AND (auth.uid() = p_user_id OR coalesce(auth.role(), '') = 'service_role')
    AND (p_start_date IS NULL OR date >= p_start_date::date)
    AND (p_end_date IS NULL OR date <= p_end_date::date);
$$;

REVOKE ALL ON FUNCTION public.get_total_income_and_chomesh_for_user(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_total_income_and_chomesh_for_user(uuid, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_total_expenses_for_user(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_total_expenses_for_user(uuid, text, text) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_total_donations_for_user(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_total_donations_for_user(uuid, text, text) TO authenticated, service_role;
