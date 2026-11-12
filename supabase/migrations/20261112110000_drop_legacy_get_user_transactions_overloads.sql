-- Drop the unused 9-argument and 12-argument overloads of public.get_user_transactions.
-- The current 14-argument overload stays in place:
--   (uuid, integer, integer, text, text, text[], text, text, text,
--    boolean, text[], text[], text[], text)
-- last defined in 20261112083635_stable_get_user_transactions_order.sql.
--
-- Exact legacy signatures, from 20260715090000_harden_user_transaction_rpcs.sql:
--   (uuid, integer, integer, date, date, text[], text, text, text)
--   (uuid, integer, integer, text, text, text[], text, text, text, boolean, text[], text[])
--
-- No caller in src, src-tauri, supabase/functions, scripts, or tests resolves to either
-- legacy overload. The only PostgREST caller always sends p_payment_methods, which
-- exists only on the current overload. Desktop reads SQLite.

DROP FUNCTION IF EXISTS public.get_user_transactions(uuid, integer, integer, date, date, text[], text, text, text);
DROP FUNCTION IF EXISTS public.get_user_transactions(uuid, integer, integer, text, text, text[], text, text, text, boolean, text[], text[]);

DO $postconditions$
DECLARE
  remaining integer;
BEGIN
  IF to_regprocedure('public.get_user_transactions(uuid,integer,integer,date,date,text[],text,text,text)') IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy 9-argument get_user_transactions still exists';
  END IF;

  IF to_regprocedure('public.get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[])') IS NOT NULL THEN
    RAISE EXCEPTION 'Legacy 12-argument get_user_transactions still exists';
  END IF;

  IF to_regprocedure('public.get_user_transactions(uuid,integer,integer,text,text,text[],text,text,text,boolean,text[],text[],text[],text)') IS NULL THEN
    RAISE EXCEPTION 'Current 14-argument get_user_transactions is missing';
  END IF;

  SELECT count(*)
  INTO remaining
  FROM pg_proc
  WHERE proname = 'get_user_transactions'
    AND pronamespace = 'public'::regnamespace;

  IF remaining <> 1 THEN
    RAISE EXCEPTION 'Expected exactly one public.get_user_transactions overload, found %', remaining;
  END IF;
END;
$postconditions$;
