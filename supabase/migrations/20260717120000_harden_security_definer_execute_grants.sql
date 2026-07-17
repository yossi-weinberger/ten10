-- Harden SECURITY DEFINER RPC EXECUTE grants.
-- A1: increment_download_count -> service_role only
-- A2: admin RPCs -> authenticated (+ service_role), not anon
-- A2b: trigger/event helpers -> no REST execute for app roles
-- A3: analytics/user/contact RPCs -> authenticated (+ service_role), not anon

DO $preconditions$
DECLARE
  required_signature text;
  required_signatures constant text[] := ARRAY[
    'public.increment_download_count(text)',
    'public.get_admin_dashboard_stats()',
    'public.get_admin_dashboard_stats(integer)',
    'public.get_admin_monthly_trends(date,date)',
    'public.get_earliest_system_date()',
    'public.is_admin_user()',
    'public.handle_new_user()',
    'public.handle_updated_at()',
    'public.rls_auto_enable()',
    'public.get_analytics_breakdowns(text,text)',
    'public.get_analytics_range_stats(text,text)',
    'public.get_category_breakdown(text,text,text)',
    'public.get_daily_transaction_heatmap(text,text,text)',
    'public.get_user_categories(text)',
    'public.get_user_payment_methods()',
    'public.handle_contact_form(text,text,text,text,jsonb,text,text,text,text)',
    'public.handle_contact_form(text,text,text,text,jsonb,text,text,text,text,text,text,text,text)'
  ];
BEGIN
  FOREACH required_signature IN ARRAY required_signatures LOOP
    IF to_regprocedure(required_signature) IS NULL THEN
      RAISE EXCEPTION 'Required function is missing: %', required_signature;
    END IF;
  END LOOP;
END;
$preconditions$;

-- ---------------------------------------------------------------------------
-- A1: download rate-limit RPC (Edge Function uses service_role)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.increment_download_count(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_download_count(text)
  TO service_role;

-- ---------------------------------------------------------------------------
-- A2: admin RPCs
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats()
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_dashboard_stats(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_dashboard_stats(integer)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_admin_monthly_trends(date, date)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_monthly_trends(date, date)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_earliest_system_date()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_earliest_system_date()
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.is_admin_user()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin_user()
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- A2b: trigger / event helpers (not callable via PostgREST)
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.handle_updated_at()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.rls_auto_enable()
  FROM PUBLIC, anon, authenticated;

-- ---------------------------------------------------------------------------
-- A3: analytics / user helpers / contact
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.get_analytics_breakdowns(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_breakdowns(text, text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_analytics_range_stats(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_analytics_range_stats(text, text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_category_breakdown(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_category_breakdown(text, text, text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_daily_transaction_heatmap(text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_daily_transaction_heatmap(text, text, text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_categories(text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_categories(text)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_user_payment_methods()
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_payment_methods()
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_contact_form(
  text, text, text, text, jsonb, text, text, text, text
)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_contact_form(
  text, text, text, text, jsonb, text, text, text, text
)
  TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.handle_contact_form(
  text, text, text, text, jsonb, text, text, text, text, text, text, text, text
)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.handle_contact_form(
  text, text, text, text, jsonb, text, text, text, text, text, text, text, text
)
  TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Post-asserts
-- ---------------------------------------------------------------------------
DO $asserts$
DECLARE
  sig text;
  service_only constant text[] := ARRAY[
    'public.increment_download_count(text)'
  ];
  authenticated_ok constant text[] := ARRAY[
    'public.get_admin_dashboard_stats()',
    'public.get_admin_dashboard_stats(integer)',
    'public.get_admin_monthly_trends(date,date)',
    'public.get_earliest_system_date()',
    'public.is_admin_user()',
    'public.get_analytics_breakdowns(text,text)',
    'public.get_analytics_range_stats(text,text)',
    'public.get_category_breakdown(text,text,text)',
    'public.get_daily_transaction_heatmap(text,text,text)',
    'public.get_user_categories(text)',
    'public.get_user_payment_methods()',
    'public.handle_contact_form(text,text,text,text,jsonb,text,text,text,text)',
    'public.handle_contact_form(text,text,text,text,jsonb,text,text,text,text,text,text,text,text)'
  ];
  trigger_locked constant text[] := ARRAY[
    'public.handle_new_user()',
    'public.handle_updated_at()',
    'public.rls_auto_enable()'
  ];
BEGIN
  FOREACH sig IN ARRAY service_only LOOP
    IF has_function_privilege('anon', sig, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon still has EXECUTE on %', sig;
    END IF;
    IF has_function_privilege('authenticated', sig, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated still has EXECUTE on %', sig;
    END IF;
    IF NOT has_function_privilege('service_role', sig, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role lacks EXECUTE on %', sig;
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY authenticated_ok LOOP
    IF has_function_privilege('anon', sig, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon still has EXECUTE on %', sig;
    END IF;
    IF NOT has_function_privilege('authenticated', sig, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated lacks EXECUTE on %', sig;
    END IF;
    IF NOT has_function_privilege('service_role', sig, 'EXECUTE') THEN
      RAISE EXCEPTION 'service_role lacks EXECUTE on %', sig;
    END IF;
  END LOOP;

  FOREACH sig IN ARRAY trigger_locked LOOP
    IF has_function_privilege('anon', sig, 'EXECUTE') THEN
      RAISE EXCEPTION 'anon still has EXECUTE on %', sig;
    END IF;
    IF has_function_privilege('authenticated', sig, 'EXECUTE') THEN
      RAISE EXCEPTION 'authenticated still has EXECUTE on %', sig;
    END IF;
  END LOOP;
END;
$asserts$;
