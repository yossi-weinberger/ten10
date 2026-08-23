# Transaction RPC Security

## Scope

This document covers the Supabase RPC functions used by the web transaction table and recurring-transaction table.

Relevant frontend services:

- `src/lib/data-layer/transactions.service.ts`
- `src/lib/data-layer/recurringTransactions.service.ts`
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

## Bulk action RPCs

Migration `20260823154606_add_atomic_bulk_transaction_actions.sql` adds four atomic bulk RPCs for the table bulk-action UI:

| Function | Signature |
| --- | --- |
| `bulk_delete_user_transactions` | `(p_user_id uuid, p_ids uuid[])` → `integer` |
| `bulk_update_user_transactions` | `(p_user_id uuid, p_ids uuid[], p_field text, p_value text)` → `integer` |
| `bulk_delete_user_recurring_transactions` | `(p_user_id uuid, p_ids uuid[])` → `integer` |
| `bulk_update_user_recurring_transactions` | `(p_user_id uuid, p_ids uuid[], p_field text, p_value text)` → `integer` |

All four are `SECURITY INVOKER` with `SET search_path = ''`. Table RLS on `public.transactions` and `public.recurring_transactions` remains authoritative (same model as hardened single-row RPCs).

**Allowed update fields:**

- Transactions: `payment_method`, `category` only. Rejects `initial_balance` rows and mixed/non-applicable category families server-side.
- Recurring: `status` (`active`, `paused`, `cancelled`), `payment_method`, `category`. Rejects `completed` rows and mixed/non-applicable category families.

**Recurring bulk delete and `source_recurring_id`:** the migration preconditions require FK `transactions.source_recurring_id → recurring_transactions.id` with `ON DELETE SET NULL` (`confdeltype = 'n'`). Deleting recurring rows therefore nulls linked transaction occurrences on Web via FK; Desktop mirrors this explicitly in `bulk_delete_recurring_transactions_handler`.

**Grants (same pattern as hardened RPCs):**

- `PUBLIC`: no execute
- `anon`: no execute
- `authenticated`: execute
- `service_role`: execute

Postconditions in the migration verify `SECURITY INVOKER`, empty `search_path`, and grant shape.

**Web callers:** `bulkDeleteTransactions` / `bulkUpdateTransactions` in `src/lib/data-layer/transactions.service.ts`; `bulkDeleteRecurringTransactions` / `bulkUpdateRecurringTransactions` in `src/lib/data-layer/recurringTransactions.service.ts`.

**Desktop callers (SQLite transaction, all-or-nothing):**

- `bulk_delete_transactions_handler`
- `bulk_update_transactions_handler`
- `bulk_delete_recurring_transactions_handler` (nulls `source_recurring_id` then deletes)
- `bulk_update_recurring_transactions_handler`

Registered in `src-tauri/src/main.rs`. Rust `#[test]` coverage in `transaction_commands.rs` and `recurring_transaction_commands.rs`.

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

## Still excluded (separate flow — locked)

- `update_user_preferences(uuid, boolean, boolean)`: remains `SECURITY DEFINER` for the unsubscribe Edge Function. Phase 2 locks `EXECUTE` to `service_role` only; browser clients must not call this RPC.

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
10. bulk-delete and bulk-update selected transactions (if UI available)
11. bulk-delete and bulk-update selected recurring rows (if UI available)

Also verify through database metadata that every targeted overload is `SECURITY INVOKER`, unavailable to `anon`, and executable by `authenticated` and `service_role` — including the four bulk functions from `20260823154606_add_atomic_bulk_transaction_actions.sql`.

## Future changes

When adding a new overload, update all of the following together:

- migration precondition signature inventory
- `ALTER FUNCTION ... SECURITY INVOKER` (or intentional `SECURITY DEFINER` with documented reason)
- revoke and grant statements
- migration postconditions
- this document

Do not silently add a `SECURITY DEFINER` overload to solve an RLS or permission error.

When adding bulk-capable RPCs, also add matching Desktop Tauri handlers with SQLite transactions if the feature is cross-platform.
