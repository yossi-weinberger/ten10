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

The four bulk RPCs also enforce a runtime ownership guard before validation or row access: unless `auth.role()` is `service_role`, `auth.uid()` must match `p_user_id` using a NULL-safe comparison. This is defense in depth independent of RLS.

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
| `bulk_update_user_transactions` | `(p_user_id uuid, p_ids uuid[], p_updates jsonb)` → `integer` |
| `bulk_delete_user_recurring_transactions` | `(p_user_id uuid, p_ids uuid[])` → `integer` |
| `bulk_update_user_recurring_transactions` | `(p_user_id uuid, p_ids uuid[], p_updates jsonb)` → `integer` |

Migration `20260824071032_harden_bulk_transaction_actions.sql` replaces all four without changing their signatures or return types. They remain `SECURITY INVOKER` with `SET search_path = ''`, retain exact-count atomicity and ordered row locking, and reject a non-`service_role` caller when `auth.uid() IS DISTINCT FROM p_user_id`. The role check uses `coalesce(auth.role(), '')` so a missing role cannot bypass the guard.

**Allowed update fields (jsonb patch):**

- Keys ⊆ `{payment_method, category, description, recipient, is_chomesh}`. Unknown keys, non-objects, and `{}` are rejected. Key presence writes the field; JSON `null` clears a text field; missing keys stay unchanged.
- Transactions: rejects `initial_balance` rows. Recurring: rejects `completed` rows.
- `category` requires one income or expense family. `recipient` requires every locked row to be `donation` or `non_tithe_donation`. `is_chomesh` requires every locked row to share the same type in `{income, donation, expense, recognized-expense}` and a boolean value.
- Lengths: `description` ≤ 100; `payment_method`, `category`, `recipient` ≤ 50. TypeScript `assertBulkPatch` and the Tauri handlers enforce the same limits before dispatch.
- Recurring `status` is not an allowed key. Recurring bulk status editing remains deferred until occurrence creation and recurring-state advancement are atomic together.

The initial create migration installed single-field `(uuid, uuid[], text, text)` updaters. Forward migration `20260824114314_limit_bulk_update_text_values.sql` added the 50-character `p_value` guard on that signature. Forward migration `20260824175500_bulk_update_json_patch.sql` **drops** those four-argument signatures and replaces them with the jsonb patch functions above, keeping `SECURITY INVOKER`, empty `search_path`, postgres ownership, and the same EXECUTE grants.

**Recurring bulk delete and `source_recurring_id`:** the migration preconditions require FK `transactions.source_recurring_id → recurring_transactions.id` with `ON DELETE SET NULL` (`confdeltype = 'n'`). Deleting recurring rows therefore nulls linked transaction occurrences on Web via FK; Desktop mirrors this explicitly in `bulk_delete_recurring_transactions_handler`.

**Grants (same pattern as hardened RPCs):**

- `PUBLIC`: no execute
- `anon`: no execute
- `authenticated`: execute
- `service_role`: execute

Forward migration `20260824100005_enforce_bulk_transaction_function_ownership.sql` explicitly transfers all four exact signatures to the trusted `postgres` owner, then reapplies the least-privilege grants above without changing function bodies or signatures. Its preconditions require every signature and the `postgres` role to exist. Its per-function postconditions fail closed unless the resolved owner is exactly `postgres`, the function remains `SECURITY INVOKER`, `PUBLIC` / `anon` cannot execute, `authenticated` / `service_role` can execute, and no unexpected non-owner execute grantee exists.

Postconditions in the original hardening migration continue to verify empty `search_path`, the runtime auth guard in every function definition, and recurring status exclusion.

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

Do not trust the client-provided ID by itself. Bulk RPC authorization requires the JWT-derived `auth.uid()` ownership guard and remains backed by table RLS.

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

Also verify through database metadata that every targeted overload is `SECURITY INVOKER`, has an empty `search_path`, is unavailable to `PUBLIC` / `anon`, and has explicit execute grants only for `authenticated` and `service_role`. For the four bulk functions, also inspect `pg_get_functiondef` for the NULL-safe runtime ownership guard and verify that recurring bulk update accepts only `payment_method` and `category`.

## Future changes

When adding a new overload, update all of the following together:

- migration precondition signature inventory
- `ALTER FUNCTION ... SECURITY INVOKER` (or intentional `SECURITY DEFINER` with documented reason)
- revoke and grant statements
- migration postconditions
- this document

Do not silently add a `SECURITY DEFINER` overload to solve an RLS or permission error.

When adding bulk-capable RPCs, also add matching Desktop Tauri handlers with SQLite transactions if the feature is cross-platform.
