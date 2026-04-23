# Supabase database & RPC inventory (project-wide)

Read-only reference: **entire `public` schema routine catalog** (staging) cross-checked with **all client RPC usage**, **PostgREST table access**, and **Edge Functions**. Use this for audits, onboarding, and cleanup planning — it does not modify the database.

**Project IDs:** Staging `ngtsnskyupageagcmqdp` · Production `flpzqbvbymoluoeeeofg`

---

## 1. Scope: what this document covers

| Layer | Covered |
|-------|---------|
| Postgres **`public` functions/procedures** | Full list (§3) from live staging |
| **`supabase.rpc("…")` in `src/`** | All call sites (§4) |
| **Edge Functions** (`supabase/functions/`) | RPC + `.from()` usage (§5) |
| **Direct table access** (no RPC) | Key `.from("…")` usage in app (§6) |
| **Analytics-only cleanup migration** | Verification + dropped names (§7) |
| **Gaps / orphans** | DB routines without TS/Edge RPC match (§8) |

Not covered here in depth: **SQLite / Tauri** command surface (see `src-tauri/` and desktop guides), **Auth** (`auth.users` via SDK), **Realtime** subscriptions if any.

---

## 2. Complete `public` routine catalog (staging snapshot)

Run to refresh after migrations:

```sql
SELECT p.proname || '(' || coalesce(pg_get_function_identity_arguments(p.oid), '') || ')' AS signature
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prokind IN ('f','p','w')
ORDER BY p.proname, signature;
```

**Snapshot (52 overload rows, 2026):**

| # | Signature |
|---|-----------|
| 1 | `calculate_new_next_due_date(p_current_next_due_date date, p_new_day_of_month integer)` |
| 2 | `calculate_user_tithe_balance(p_user_id uuid)` |
| 3 | `clear_all_user_data()` |
| 4 | `delete_recurring_transaction(p_id uuid, p_user_id uuid)` |
| 5 | `delete_user_transaction(p_transaction_id uuid, p_user_id uuid)` |
| 6 | `execute_due_recurring_transactions()` |
| 7 | `export_user_transactions(p_user_id uuid, p_date_from date, p_date_to date, p_types text[], p_search text)` |
| 8 | `get_active_connections()` |
| 9 | `get_admin_dashboard_stats()` |
| 10 | `get_admin_dashboard_stats(p_days_back integer)` |
| 11 | `get_admin_monthly_trends(p_start_date date, p_end_date date)` |
| 12 | `get_analytics_breakdowns(p_start_date text, p_end_date text)` |
| 13 | `get_analytics_range_stats(p_start_date text, p_end_date text)` |
| 14 | `get_category_breakdown(p_start_date text, p_end_date text, p_type text)` |
| 15 | `get_daily_expenses(p_user_id uuid, p_start_date date, p_end_date date)` |
| 16 | `get_daily_transaction_heatmap(p_start_date text, p_end_date text, p_type_group text)` |
| 17 | `get_earliest_system_date()` |
| 18 | `get_expenses_by_category(p_user_id uuid, p_start_date date, p_end_date date)` |
| 19 | `get_expenses_by_payment_method(p_user_id uuid, p_start_date date, p_end_date date)` |
| 20 | `get_experiment_chart_data(p_user_id uuid)` |
| 21 | `get_income_by_category(p_user_id uuid, p_start_date date, p_end_date date)` |
| 22 | `get_missing_indexes()` |
| 23 | `get_monthly_financial_summary(p_user_id uuid, p_end_date text, p_num_months integer)` |
| 24 | `get_paginated_transactions(page_number integer, page_size integer, search_term_param text, date_from_param date, date_to_param date, types_param text[])` |
| 25 | `get_recurring_transaction_by_id(p_id uuid)` |
| 26 | `get_reminder_users_with_emails(reminder_day integer)` |
| 27 | `get_slow_queries()` |
| 28 | `get_table_stats()` |
| 29 | `get_tables_without_rls()` |
| 30 | `get_total_donations_for_user(p_user_id uuid, p_start_date text, p_end_date text)` |
| 31 | `get_total_expenses_for_user(p_user_id uuid, p_start_date text, p_end_date text)` |
| 32 | `get_total_income_and_chomesh_for_user(p_user_id uuid, p_start_date text, p_end_date text)` |
| 33 | `get_user_categories(p_type text)` |
| 34 | `get_user_payment_methods()` |
| 35–38 | `get_user_recurring_transactions` (4 overloads — see §3 note) |
| 39–41 | `get_user_transactions` (3 overloads — app uses the richest param set) |
| 42–43 | `handle_contact_form` (2 overloads) |
| 44 | `handle_new_user()` |
| 45 | `handle_updated_at()` |
| 46 | `increment_download_count(p_email text)` |
| 47 | `is_admin_user()` |
| 48 | `log_rls_values(uid text, user_id_val text)` |
| 49 | `rls_auto_enable()` |
| 50 | `update_recurring_transaction(...)` (full currency-conversion param list) |
| 51 | `update_user_preferences(p_user_id uuid, p_reminder_enabled boolean, p_mailing_list_consent boolean)` |
| 52 | `update_user_transaction(p_transaction_id uuid, p_user_id uuid, p_updates jsonb)` |

**Note:** `get_cron_job_failures` is added by migration `20260409120000_add_get_cron_job_failures.sql`; staging/production inventories taken **before** that migration will not list it until applied.

**Note:** `update_recurring_transaction` is fixed by migration `20260423120000_fix_update_recurring_transaction_rpc.sql` to include currency conversion parameters (`p_original_amount`, `p_original_currency`, `p_conversion_rate`, `p_conversion_date`, `p_rate_source`).

---

## 3. RPCs by product area — `src/` (alphabetical by RPC name)

| RPC | Area | Primary files |
|-----|------|----------------|
| `calculate_user_tithe_balance` | Dashboard / tithe | `stats.service.ts`, `analytics.service.ts` |
| `clear_all_user_data` | Settings / data management | `dataManagement/clear.ts` |
| `delete_recurring_transaction` | Recurring table | `recurringTable.service.ts` |
| `delete_user_transaction` | Transactions CRUD | `transactions.service.ts` |
| `get_admin_dashboard_stats` | Admin | `routes.ts`, `admin.service.ts` |
| `get_admin_monthly_trends` | Admin | `admin.service.ts` |
| `get_analytics_breakdowns` | Analytics insights | `insights.service.ts` |
| `get_analytics_range_stats` | Analytics KPIs | `analytics.service.ts` |
| `get_category_breakdown` | Analytics | `insights.service.ts` |
| `get_daily_transaction_heatmap` | Analytics | `insights.service.ts` |
| `get_earliest_system_date` | Admin | `admin.service.ts` |
| `get_monthly_financial_summary` | Home chart | `chart.service.ts` |
| `get_total_donations_for_user` | Stats / analytics | `stats.service.ts`, `analytics.service.ts` |
| `get_total_expenses_for_user` | Stats / analytics | `stats.service.ts`, `analytics.service.ts` |
| `get_total_income_and_chomesh_for_user` | Stats / analytics | `stats.service.ts`, `analytics.service.ts` |
| `get_recurring_transaction_by_id` | Recurring | `recurringTransactions.service.ts` |
| `get_user_categories` | Forms / combobox | `categories.service.ts` |
| `get_user_payment_methods` | Forms | `paymentMethods.service.ts` |
| `get_user_recurring_transactions` | Recurring table | `recurringTable.service.ts` |
| `get_user_transactions` | Transactions table | `tableTransactionService.ts` |
| `handle_contact_form` | Contact | `contact.service.ts` |
| `update_recurring_transaction` | Recurring table | `recurringTable.service.ts` |
| `update_user_preferences` | Unsubscribe | `UnsubscribePage.tsx` |
| `update_user_transaction` | Transactions CRUD | `transactions.service.ts` |

---

## 4. Edge Functions — RPC and table usage

| Function folder | RPCs | Notable `.from()` / other |
|-----------------|------|---------------------------|
| `get-monitoring-data` | `get_active_connections`, `get_slow_queries`, `get_table_stats`, `get_tables_without_rls`, `get_missing_indexes` | `admin_emails`, `auth.audit_log_entries`, `download_requests` |
| `process-email-request` | `increment_download_count` | `download_requests` insert |
| `send-cron-alerts` | `get_cron_job_failures` (see `20260409120000_add_get_cron_job_failures.sql`) | `profiles`, `admin_emails` |
| `send-reminder-emails` | `get_reminder_users_with_emails`, `calculate_user_tithe_balance` | `profiles` |
| `send-new-user-email` | — | `profiles`, `download_requests` |
| `process-recurring-transactions` | — | `recurring_transactions`, `transactions`, `profiles` |
| Others (`send-contact-email`, `verify-captcha`, `verify-unsubscribe-token`) | — | Storage / HTTP only |

Service role Edge code may access tables the **anon web app** never touches directly.

---

## 5. Direct PostgREST access (`supabase.from`) — web app

RLS applies. No RPC — used for simple CRUD or reads:

| Table | Typical use | Example files |
|-------|-------------|---------------|
| `transactions` | Load/save/update rows | `transactions.service.ts`, `dataManagement/web.ts` |
| `recurring_transactions` | List/add/update, analytics active recurring | `recurringTransactions.service.ts`, `dataManagement/web.ts`, `insights.service.ts` |
| `profiles` | Settings, preferences, terms, avatars | `SettingsPage`, `ProfilePage`, `preferences-sync.service.ts`, etc. |

Storage bucket `avatars` appears in `UserInfoDisplay.tsx` (not Postgres RPC).

---

## 6. Analytics cleanup migration (`20260330000000_cleanup_unused_analytics_rpcs`)

| Environment | In `schema_migrations` |
|-------------|-------------------------|
| Staging | Yes (`20260330140623` / `20260330000000_cleanup_unused_analytics_rpcs`) |
| Production | Yes (`20260330000000` / `cleanup_unused_analytics_rpcs`) |

**Dropped from DB:** `get_payment_method_breakdown`, `get_recurring_vs_onetime`, `get_donation_recipients_breakdown`, `get_recurring_forecast`, 2-arg `get_daily_transaction_heatmap`.  
**Still in use:** 3-arg `get_daily_transaction_heatmap`, `get_analytics_breakdowns`, etc.

Details: [`features/analytics/analytics-page-guide.md`](../features/analytics/analytics-page-guide.md).

---

## 7. Orphans / gaps (DB `public` vs app RPC)

**Routines in §2 with no `supabase.rpc` in `src/` or `supabase/functions/` (except as noted):**

| Routine | Likely purpose |
|---------|----------------|
| `get_paginated_transactions`, `export_user_transactions` | Legacy; app uses `get_user_transactions` + client-side export |
| `get_daily_expenses`, `get_expenses_by_*`, `get_income_by_category`, `get_experiment_chart_data` | Legacy or experimental; verify before DROP |
| `execute_due_recurring_transactions`, `calculate_new_next_due_date` | Cron / SQL triggers / `process-recurring-transactions` flow |
| `handle_new_user`, `handle_updated_at` | Triggers |
| `is_admin_user`, `log_rls_values`, `rls_auto_enable` | RLS / admin helpers |

**Resolved in repo:** `get_cron_job_failures` — was referenced in `send-cron-alerts/index.ts` without a DB definition. Implemented in migration `20260409120000_add_get_cron_job_failures.sql` (queries `cron.job_run_details` + `cron.job`, `SECURITY DEFINER`, `GRANT EXECUTE` to `service_role` only). Apply on staging/production so the Edge call stops returning “function does not exist”.

**Monitoring RPCs** (`get_active_connections`, etc.) exist in DB and are used only from `get-monitoring-data`.

---

## 8. Safe cleanup playbook (ordered — minimize breakage)

Use this when removing **DB functions** or fixing **dead references**. Follow repo rules: migrations in Git, **staging first**, never ad-hoc DROP on production.

### Phase A — Fix known broken references (before any DROP)

1. **`get_cron_job_failures`** — migration `20260409120000_add_get_cron_job_failures.sql` adds the RPC; deploy DB before relying on `send-cron-alerts`. If anything still fails, verify `pg_cron` and that failed runs use `status = 'failed'` in your Postgres version.
2. Re-run the inventory grep + optional `execute_sql` to confirm no other “call without definition” pairs.

### Phase B — Classify each orphan (from §7)

For every candidate `DROP`, record:

| Check | Action |
|-------|--------|
| `grep` in `src/`, `supabase/functions/`, `supabase/migrations/` | If referenced anywhere, **do not drop** until call sites are removed. |
| Triggers / cron | Search migrations for `EXECUTE FUNCTION`, `cron.schedule`, `pg_net` referencing the name. |
| `pg_depend` / views | Optional: ensure no view or materialized view depends on the function. |
| Usage stats | Optional: `pg_stat_user_functions` (requires `track_functions`) — `calls = 0` for a long window is a hint, not proof. |

### Phase C — Staging migration (one logical change per PR when possible)

1. Add **`DROP FUNCTION IF EXISTS name(argtypes);`** — Postgres needs **exact** argument types (see §2 signatures).
2. Apply on **staging** via MCP `apply_migration` or project workflow ([`supabase-database-migrations-workflow.md`](supabase-database-migrations-workflow.md)).
3. **Smoke test matrix:** web app (login, transactions table, recurring, analytics, admin if applicable), and **each Edge Function** that touches Postgres (especially `send-cron-alerts`, `process-recurring-transactions`, reminders).

### Phase D — Production

1. Merge after staging sign-off; CI/deploy applies migration to production.
2. Monitor logs for `function does not exist` / PostgREST 404 on `/rpc/...`.

### Phase E — What to defer or never drop via blind cleanup

- **`handle_*` triggers**, **`execute_due_recurring_transactions`**, **`calculate_new_next_due_date`** — confirm with recurring/cron docs first.
- **`get_paginated_transactions` / `export_user_transactions`** — drop only after confirming no external client, script, or old mobile build calls them (PostgREST exposes RPC by name).
- **App-layer duplication** (e.g. `stats.service.ts` vs `analytics.service.ts` calling the same RPC) — refactor in TypeScript **without** DB changes; lower risk, separate PR.

### Rollback

Restoring a dropped function requires a **new migration** that `CREATE OR REPLACE`s the old body — keep the previous function definition in Git history or a branch before dropping.

---

## 9. Related documentation

- [`supabase-integration-status.md`](supabase-integration-status.md) — integration status + link here  
- [`supabase-database-migrations-workflow.md`](supabase-database-migrations-workflow.md) — how to ship migrations  
- [`features/analytics/analytics-page-guide.md`](../features/analytics/analytics-page-guide.md) — Analytics RPCs and Tauri parity  
- [`platforms/desktop-data-saving-guide.md`](../platforms/desktop-data-saving-guide.md) — Desktop vs web persistence  

Refresh this inventory after **any** migration that adds/removes `public` functions or changes Edge/app call sites.

See **§8 Safe cleanup playbook** for an ordered production-safe process.
