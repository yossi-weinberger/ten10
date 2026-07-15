# Supabase RPC Security Model

## Purpose

This document defines the expected security model for Supabase Postgres functions exposed through the Data API.

## Core rule

A `SECURITY DEFINER` function bypasses the caller's Row Level Security context and runs with the function owner's privileges. Do not use `SECURITY DEFINER` for ordinary user-facing reads or writes merely to avoid permission problems.

For user-owned application data, prefer:

1. `SECURITY INVOKER`
2. RLS enabled on the underlying tables
3. ownership policies based on `(select auth.uid())`
4. explicit `EXECUTE` grants only to the roles that should call the function

## User-facing RPCs

User-facing RPCs that operate on `transactions`, `recurring_transactions`, or `profiles` should normally run as `SECURITY INVOKER` so the existing RLS policies remain authoritative.

The frontend may still pass `p_user_id` for compatibility with existing function signatures, but authorization must not depend on trusting that value. With `SECURITY INVOKER`, a forged `p_user_id` cannot bypass RLS.

Preferred grants:

```sql
REVOKE EXECUTE ON FUNCTION public.example_function(...) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.example_function(...) TO authenticated, service_role;
```

`anon` should not be able to execute authenticated user-data RPCs.

## Service-role RPCs

Functions intended only for cron jobs, Edge Functions, monitoring, email delivery, or administrative backend workflows should not be callable by `PUBLIC`, `anon`, or ordinary `authenticated` users.

Preferred grants:

```sql
REVOKE EXECUTE ON FUNCTION public.internal_function(...) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.internal_function(...) TO service_role;
```

Where practical, internal privileged helpers should live in a non-exposed schema rather than `public`.

## Intentionally privileged user operations

Some flows may genuinely need a privileged function, for example:

- verified unsubscribe links
- trigger functions
- admin-only aggregate functions
- server-side calculations for users selected by a reminder job

These require individual review. A privileged function must authenticate or validate its caller or token inside the function or be executable only by `service_role`.

Do not convert such functions to `SECURITY INVOKER` without checking all anonymous and server-side call paths.

## Migration requirements

Every migration that changes function security or grants should:

- use exact function signatures, including every overload
- fail when an expected signature is missing
- revoke from `PUBLIC` as well as named roles
- explicitly grant the intended roles
- verify postconditions after the changes
- check that `to_regprocedure(...)` did not return `NULL` before privilege checks

Example postcondition pattern:

```sql
function_oid := to_regprocedure(required_signature);

IF function_oid IS NULL THEN
  RAISE EXCEPTION 'Required function is missing: %', required_signature;
END IF;
```

## Current transaction hardening

Migration `20260715090000_harden_user_transaction_rpcs.sql` changes the active transaction and recurring-transaction RPC overloads to `SECURITY INVOKER`, revokes `anon`, and retains `authenticated` and `service_role` execution.

The migration intentionally preserves the existing public signatures to avoid a coordinated frontend deployment.

## Dual-caller privileged RPCs

Some functions are called both by an authenticated browser session and by a `service_role` Edge Function. Prefer an in-function guard over splitting signatures when the public API must stay stable:

```sql
IF auth.role() <> 'service_role'
   AND auth.uid() IS DISTINCT FROM p_user_id THEN
  RAISE EXCEPTION 'Access denied';
END IF;
```

Migration `20260715190000_harden_calculate_user_tithe_balance.sql` applies this pattern to `calculate_user_tithe_balance(uuid)` while keeping `SECURITY DEFINER`, revoking `anon`, and granting `authenticated` + `service_role`.

## Review checklist for future RPC changes

Before creating or modifying an RPC, determine:

- Is it called directly by the browser?
- Is it called by an Edge Function or cron job with `service_role`?
- Does it accept a user ID supplied by the caller?
- Does it query or mutate an RLS-protected table?
- Does it need to bypass RLS at all?
- Which exact roles have `EXECUTE`, including inherited `PUBLIC` access?
- Are all overloads covered?
- Does relevant documentation under `llm-instructions/` need updating?
