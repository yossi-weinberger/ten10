-- B1: wrap auth.* calls in RLS policies with (select ...) for initplan
-- B2: covering indexes for hot foreign keys

-- ---------------------------------------------------------------------------
-- B1: admin_emails
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Admins can view admin_emails" ON public.admin_emails;
CREATE POLICY "Admins can view admin_emails"
  ON public.admin_emails
  FOR SELECT
  TO public
  USING (
    (SELECT auth.email()) IN (
      SELECT admin_emails_1.email
      FROM admin_emails admin_emails_1
    )
  );

DROP POLICY IF EXISTS "Admins can insert admin_emails" ON public.admin_emails;
CREATE POLICY "Admins can insert admin_emails"
  ON public.admin_emails
  FOR INSERT
  TO public
  WITH CHECK (
    (SELECT auth.email()) IN (
      SELECT admin_emails_1.email
      FROM admin_emails admin_emails_1
    )
  );

DROP POLICY IF EXISTS "Admins can delete admin_emails" ON public.admin_emails;
CREATE POLICY "Admins can delete admin_emails"
  ON public.admin_emails
  FOR DELETE
  TO public
  USING (
    (SELECT auth.email()) IN (
      SELECT admin_emails_1.email
      FROM admin_emails admin_emails_1
    )
  );

-- ---------------------------------------------------------------------------
-- B1: download_rate_limits / download_requests
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Service role only" ON public.download_rate_limits;
CREATE POLICY "Service role only"
  ON public.download_rate_limits
  FOR ALL
  TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

DROP POLICY IF EXISTS "Service role only" ON public.download_requests;
CREATE POLICY "Service role only"
  ON public.download_requests
  FOR ALL
  TO public
  USING ((SELECT auth.role()) = 'service_role')
  WITH CHECK ((SELECT auth.role()) = 'service_role');

-- ---------------------------------------------------------------------------
-- B2: FK covering indexes
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_transactions_source_recurring_id
  ON public.transactions (source_recurring_id);

CREATE INDEX IF NOT EXISTS idx_recurring_transactions_user_id
  ON public.recurring_transactions (user_id);

-- ---------------------------------------------------------------------------
-- Post-asserts
-- ---------------------------------------------------------------------------
DO $asserts$
DECLARE
  policy_def text;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_transactions_source_recurring_id'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_transactions_source_recurring_id';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_recurring_transactions_user_id'
  ) THEN
    RAISE EXCEPTION 'Missing index idx_recurring_transactions_user_id';
  END IF;

  SELECT qual INTO policy_def
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'admin_emails'
    AND policyname = 'Admins can view admin_emails';

  IF policy_def IS NULL
     OR (
       position('(SELECT auth.email())' in policy_def) = 0
       AND position('(select auth.email())' in policy_def) = 0
     ) THEN
    RAISE EXCEPTION 'admin_emails view policy missing (select auth.email()) wrapper';
  END IF;

  SELECT qual INTO policy_def
  FROM pg_policies
  WHERE schemaname = 'public'
    AND tablename = 'download_rate_limits'
    AND policyname = 'Service role only';

  IF policy_def IS NULL
     OR (
       position('(SELECT auth.role())' in policy_def) = 0
       AND position('(select auth.role())' in policy_def) = 0
     ) THEN
    RAISE EXCEPTION 'download_rate_limits policy missing (select auth.role()) wrapper';
  END IF;
END;
$asserts$;
