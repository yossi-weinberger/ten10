# Transactions Table Implementation Status and Reference

This document is the current implementation reference for the Ten10 transactions table.
For the detailed authorization model, read [`transaction-rpc-security.md`](./transaction-rpc-security.md).

## Current status

Implemented:

- Display of regular and recurring transactions.
- Server-side filtering and sorting.
- Pagination with load more.
- Editing and deletion with optimistic UI updates and rollback on failure.
- CSV, Excel and PDF export.
- CSV and Excel import through a review wizard.
- Month separators in the table and PDF export when sorting by date.
- Shared service and store interfaces for web and desktop.

Removed:

- Realtime subscriptions. The table relies on optimistic updates and explicit refreshes.

## Main files

```text
src/pages/TransactionsTable.tsx
src/components/TransactionsTable/
src/lib/tableTransactions/tableTransactionService.ts
src/lib/tableTransactions/recurringTable.service.ts
src/lib/tableTransactions/tableTransactions.store.ts
src/lib/tableTransactions/tableTransactions.types.ts
src/types/transaction.ts
```

Platform-specific backends:

- Web: Supabase RPCs and PostgreSQL RLS.
- Desktop: Tauri commands and local SQLite.

## Data model

The common `Transaction` model uses database-style `snake_case` fields, including:

- `id`
- `user_id`
- `date`
- `amount`
- `currency`
- `description`
- `type`
- `category`
- `is_chomesh`
- `recipient`
- `payment_method`
- `source_recurring_id`
- recurring execution metadata

The table-specific model may include derived recurring information used only for display and filtering.

## Filtering and sorting

The web RPC supports:

- Date range.
- Transaction types.
- Text search.
- Sort field and direction.
- Recurring versus non-recurring.
- Recurring statuses.
- Recurring frequencies.
- Payment methods.

The desktop command accepts an equivalent filter payload.

All table filtering and sorting are performed by the backend for both platforms.

## Web RPCs

The active transaction-table RPC family includes:

- `get_user_transactions` overloads.
- `update_user_transaction`.
- `delete_user_transaction`.
- `get_user_recurring_transactions` overloads.
- `update_recurring_transaction`.
- `delete_recurring_transaction`.

The frontend currently passes `p_user_id` for compatibility with the existing signatures.
That value is not trusted as authorization.

### Current security mode

Migration `20260715090000_harden_user_transaction_rpcs.sql` changed the active overloads to `SECURITY INVOKER`.

This means:

- Calls execute with the database role of the caller.
- Authenticated browser calls remain subject to table RLS.
- A forged `p_user_id` cannot expose or mutate another user's rows.
- `anon` does not have execute permission.
- `authenticated` and `service_role` have explicit execute permission.
- RPC names and parameter signatures remain unchanged.

Do not document these functions as `SECURITY DEFINER` unless a later migration deliberately changes the model.

## RLS ownership rules

`public.transactions` has user-ownership policies for:

- `SELECT`
- `INSERT`
- `UPDATE`
- `DELETE`

`public.recurring_transactions` has an ownership policy covering user operations.

The policy condition is based on the authenticated identity, conceptually:

```sql
user_id = (SELECT auth.uid())
```

The browser's `p_user_id` argument does not replace this check.

## Transaction fetch

`tableTransactionService.ts` calls `get_user_transactions` with pagination, filters and sorting.
The RPC returns the matching rows and total count required by the store.

Export reuses the same fetch path with a high limit rather than a separate export RPC.

## Transaction update and delete

Web operations call:

- `update_user_transaction`
- `delete_user_transaction`

Desktop operations call their Tauri equivalents.

The store applies optimistic updates and restores the previous state when the backend operation fails.

## Recurring transactions

`recurringTable.service.ts` handles:

- filtered recurring-transaction reads;
- updates, including billing-day rescheduling;
- deletion;
- active-first display ordering.

The recurring RPCs use the same `SECURITY INVOKER` and RLS authorization model as regular transaction RPCs.

## Export

Export behavior:

1. Fetch all matching rows using the existing table query path.
2. Generate CSV, Excel or PDF on the client.
3. Web downloads through the browser.
4. Desktop uses the native save dialog through `saveOrDownloadExportedFile`.
5. Cancelling the desktop dialog must not show a success notification.

## Import

CSV and Excel imports use a review workflow before writing transactions.
Imports must still comply with the same ownership rules as ordinary inserts.

## UI behavior

- Separate edit experiences exist for regular and recurring transactions.
- Responsive Dialog/Drawer switching uses the variant-locking pattern.
- Month separators are shown when consecutive rows cross a calendar month while sorted by date.
- PDF month separators mirror the table grouping.

## Important implementation principles

- Keep web and desktop behavior aligned behind the shared service interface.
- Keep filtering server-side.
- Preserve optimistic-update rollback behavior.
- Never authorize by trusting a browser-supplied user ID.
- Do not convert user-facing RPCs back to `SECURITY DEFINER` merely to bypass an RLS error.
- When changing an overloaded RPC, update every exact signature intentionally.
- Review `llm-instructions` whenever RPC signatures, grants, RLS or data flow change.

## Validation required for RPC changes

Before merging a change to transaction RPCs:

1. Verify exact production signatures.
2. Identify frontend and Edge Function callers.
3. Test normal read, update and delete operations.
4. Test a cross-user UUID or `p_user_id` attempt.
5. Verify `anon` cannot execute user RPCs.
6. Verify authenticated users retain normal access.
7. Verify service-role workflows remain compatible where applicable.
8. Update this document and `transaction-rpc-security.md` when the model changes.

## Known follow-up work

- Add automated integration tests for cross-user RPC attempts.
- Add CI checks for unsafe `SECURITY DEFINER` grants.
- Continue auditing related calculation and preference RPCs in separate PRs.
- Improve request cancellation, retries and error boundaries.
- Continue accessibility and mobile testing.

## Related documentation

- [`transaction-rpc-security.md`](./transaction-rpc-security.md)
- [`transactions-table-technical-overview.md`](./transactions-table-technical-overview.md)
- [`transaction-data-model-and-calculations.md`](./transaction-data-model-and-calculations.md)
- [`../../backend/supabase-rpc-security-model.md`](../../backend/supabase-rpc-security-model.md)
- [`../../backend/data-flow-server-calculations-and-cleanup.md`](../../backend/data-flow-server-calculations-and-cleanup.md)

**Last updated:** July 2026
