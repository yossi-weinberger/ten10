# Transaction RPC Security

## Scope

This document covers the Supabase RPC functions used by the web transaction table and recurring-transaction table.

Relevant frontend services:

- `src/lib/data-layer/transactions.service.ts`
- `src/lib/tableTransactions/tableTransactionService.ts`
- `src/lib/tableTransactions/recurringTable.service.ts`

Relevant tables:

- `public.transactions`
- `public.recurring_transactions`

## Authorization model

Both tables have RLS policies that restrict rows to the current authenticated user through `user_id = (select auth.uid())`.

The transaction RPCs therefore run as `SECURITY INVOKER`. This is intentional: it makes table RLS authoritative even when the existing RPC signature accepts `p_user_id` from the frontend.

A user may alter `p_user_id` in a manually crafted request, but RLS still prevents reading, updating, or deleting another user's rows.

## Hardened RPCs

Migration `20260715090000_harden_user_transaction_rpcs.sql` hardens these exact function families:

- `delete_user_transaction`
- `update_user_transaction`
- all active `get_user_transactions` overloads
- `delete_recurring_transaction`
- `update_recurring_transaction`
- all active `get_user_recurring_transactions` overloads

The migration preserves the existing names and argument lists, so the TypeScript callers do not need to change.

## Expected grants

For every hardened overload:

- `PUBLIC`: no execute permission
- `anon`: no execute permission
- `authenticated`: execute permission
- `service_role`: execute permission

## Frontend compatibility

The web frontend currently obtains the authenticated user's ID through `supabase.auth.getUser()` and sends it as `p_user_id`. Keep this behavior until the RPC API is intentionally redesigned.

Do not assume the client-provided ID is itself an authorization control. Authorization comes from the JWT-derived database role and RLS.

## Service-role compatibility

`service_role` retains `EXECUTE` and bypasses RLS for legitimate backend workflows. Before changing or removing a signature, search both `src/` and `supabase/functions/` for callers.

## Tithe balance RPC

Migration `20260715190000_harden_calculate_user_tithe_balance.sql` hardens `calculate_user_tithe_balance(uuid)` without changing its signature.

Authorization model (not `SECURITY INVOKER`):

- Remains `SECURITY DEFINER` because the reminder Edge Function must compute balances for many users with `service_role`.
- Non-`service_role` callers may only pass their own `auth.uid()` as `p_user_id`; otherwise the function raises `Access denied`.
- `service_role` may pass any `p_user_id` (used by `send-reminder-emails`).
- `EXECUTE` is granted to `authenticated` and `service_role` only (`PUBLIC` / `anon` revoked).
- Role check uses `coalesce(auth.role(), '')` (see `20260715203000_fix_tithe_balance_null_safe_role_guard.sql`).

Web callers: `src/lib/data-layer/analytics.service.ts`, `src/lib/data-layer/stats.service.ts`.
Server caller: `supabase/functions/send-reminder-emails/user-service.ts`.

## Still excluded (separate flow — Phase 2)

- `update_user_preferences(uuid, boolean, boolean)`: Phase 1 moves apply into `verify-unsubscribe-token` (service_role). Grants stay open until a follow-up migration locks the RPC to `service_role` only after the new frontend + Edge Function are live on production.

## Testing after deployment

Test the web application with a normal authenticated account:

1. open the transactions table
2. apply filters, sorting, and pagination
3. add a disposable transaction
4. edit it
5. delete it
6. open recurring transactions
7. filter and sort recurring rows
8. edit a recurring row
9. delete a disposable recurring row

Also verify through database metadata that every targeted overload is `SECURITY INVOKER`, unavailable to `anon`, and executable by `authenticated` and `service_role`.

## Future changes

When adding a new overload, update all of the following together:

- migration precondition signature inventory
- `ALTER FUNCTION ... SECURITY INVOKER`
- revoke and grant statements
- migration postconditions
- this document

Do not silently add a `SECURITY DEFINER` overload to solve an RLS or permission error.
