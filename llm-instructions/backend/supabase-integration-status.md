# Supabase Integration Status

This document is the current operational status of the Supabase-backed web platform.
For RPC authorization rules, read [`supabase-rpc-security-model.md`](./supabase-rpc-security-model.md).

## Platform boundary

- Web uses Supabase Auth, PostgreSQL, RLS, RPCs and Edge Functions.
- Desktop uses Tauri 2 and local SQLite.
- There is no automatic synchronization between platforms.
- Manual JSON import and export is the only cross-platform transfer mechanism.

## Authentication

Implemented:

- Email/password authentication.
- Google OAuth.
- Magic link authentication.
- Protected web routes.
- Web-only authentication; desktop remains local and does not have users.
- Profile creation trigger for new Supabase Auth users.
- Terms acceptance gate with timestamp, version and metadata.
- Logout clears user-scoped Zustand transaction state.

Remaining profile work:

- Complete editing of profile fields.
- Add password update UI.

## Profiles and RLS

`public.profiles` is linked to `auth.users` and has RLS enabled.
Users may select, insert and update only their own profile using `auth.uid()` ownership checks.

Important:

- Browser-supplied user IDs are not an authorization boundary.
- Public RPCs must use `SECURITY INVOKER` when table RLS is expected to enforce ownership.
- Exceptions require a documented trust boundary and explicit grants.

## Transactions

The web platform uses:

- `public.transactions`
- `public.recurring_transactions`
- Supabase RPCs for filtered table reads and CRUD operations.
- Direct inserts where the table RLS policy validates `user_id = auth.uid()`.

Both tables have ownership RLS based on `auth.uid()`.

### Transaction RPC security

Migration `20260715090000_harden_user_transaction_rpcs.sql` hardened the active transaction and recurring-transaction RPC overloads:

- `get_user_transactions`
- `update_user_transaction`
- `delete_user_transaction`
- `get_user_recurring_transactions`
- `update_recurring_transaction`
- `delete_recurring_transaction`

Current authorization model:

- The public signatures remain unchanged for frontend compatibility.
- The functions execute as `SECURITY INVOKER`.
- Existing RLS policies are authoritative.
- `anon` cannot execute them.
- `authenticated` and `service_role` retain execute permission.
- A forged `p_user_id` cannot grant access to another user's rows because the caller remains subject to RLS.

See [`../features/transactions/transaction-rpc-security.md`](../features/transactions/transaction-rpc-security.md).

## Analytics RPCs

User-scoped analytics RPCs that derive ownership from `auth.uid()` may remain `SECURITY DEFINER` only when there is a specific need to bypass another restriction and the body cannot select another user's data.
Prefer `SECURITY INVOKER` when ordinary RLS is sufficient.

RPCs accepting `p_user_id` require individual review even when currently `SECURITY INVOKER`.

## Mixed-context RPCs requiring separate designs

Do not apply the transaction-RPC migration pattern blindly to these functions:

### `calculate_user_tithe_balance`

It is used by both:

- the authenticated frontend for the current user; and
- reminder processing through a service-role Edge Function for multiple users.

The intended future design is separate user-scoped and service-only entry points.

### `update_user_preferences`

It is used by the token-based unsubscribe flow, where no authenticated user session is required.
The intended future design is to perform the mutation inside the token-verifying Edge Function rather than expose a browser-callable arbitrary-user RPC.

## Edge Functions

Notable flows:

- `send-new-user-email`: daily new-user summary using service role and AWS SES.
- `send-reminder-emails`: reminder-user lookup and tithe calculations using service role.
- `process-email-request`: Cloudflare Email Routing to Supabase Edge Function to AWS SES.
- `verify-unsubscribe-token`: validates signed unsubscribe tokens.
- `get-monitoring-data`: admin monitoring aggregator.
- `get-posthog-analytics`: admin-only PostHog analytics proxy.

Functions that are intentionally called without a Supabase JWT must be explicitly configured in `supabase/config.toml` and must authenticate by another documented mechanism.

## Admin access

Admin features are web-only.
Admin authorization must be enforced server-side through the `admin_emails` whitelist or a service-only Edge Function.
Frontend route guards are usability controls, not the security boundary.

Admin and internal monitoring RPCs must have exact grants reviewed separately from user RPCs.

## Database migrations workflow

- All schema, RPC, grant and cron changes belong in versioned files under `supabase/migrations/`.
- Migrations must contain exact function signatures when altering overloaded functions.
- Security migrations should include preconditions and postconditions.
- Production migrations are deployed by the GitHub workflow associated with the PR.
- Staging must not be treated as a trustworthy baseline while its migration chain is in a failed state.

See [`supabase-database-migrations-workflow.md`](./supabase-database-migrations-workflow.md).

## Cron and Vault

Cron jobs calling Edge Functions must not embed reusable service-role JWTs directly in migration SQL or visible command text.
Store environment-specific URLs and credentials in Supabase Vault where supported, and rotate any key that was previously exposed.

## Required checks for future database work

For every Supabase change:

1. Inventory every overload by exact signature.
2. Identify all frontend and Edge Function callers.
3. Decide whether authorization comes from RLS, an internal SQL check, a signed token or `service_role`.
4. Revoke default `PUBLIC` execution unless it is intentionally needed.
5. Grant only the minimum roles.
6. Test same-user and cross-user access.
7. Check whether `llm-instructions` documentation must be updated.

## Remaining security work

- Redesign `update_user_preferences` and unsubscribe mutation ownership.
- Split user and service access for `calculate_user_tithe_balance`.
- Audit remaining `SECURITY DEFINER` functions and grants.
- Move remaining cron secrets to Vault and rotate exposed credentials.
- Repair the staging migration chain.
- Add CI checks for unsafe function grants and ownership patterns.

**Last updated:** July 2026
