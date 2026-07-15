-- Harden user-facing transaction RPCs without changing their public signatures.
-- SECURITY INVOKER makes the existing transactions/recurring_transactions RLS
-- policies authoritative for authenticated callers, while service_role retains
-- its existing privileged server-side access.

DO $preconditions$
DECLARE
  required_signature text;
  required_signatures constant text[] := ARRAY[
    'public.delete_user_transaction(uuid,uuid)',