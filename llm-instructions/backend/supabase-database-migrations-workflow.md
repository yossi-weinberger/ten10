# Supabase Database Migrations – Workflow for LLMs

This document describes the full process for applying database changes (schema, RPC, cron, permissions) to the Ten10 Supabase project. **Always follow this workflow** when creating or modifying migrations.

## Overview

- **DEV**: Create a versioned migration file in git.
- **PR**: Supabase Preview applies migrations and Edge Function changes only to the persistent `testing` branch.
- **Production**: The repository migration/function workflows run only after merge/push to `main`.
- **Only new migrations**: Do not modify history, legacy files, or applied migrations.

---

## Environments

| Environment | Project Ref | Use |
|-------------|-------------|-----|
| **Production** | `flpzqbvbymoluoeeeofg` | Live app – updated only from `main` |
| **Testing** | `bbcllewcotypedqsnwmi` | Persistent Supabase branch associated with `feat/hebrew-calendar-foundation` |

### Testing safety (important)

- `testing` was cloned from production with data. Treat all rows as sensitive production data.
- All four `cron.job` entries are disabled. Keep them disabled until `service_role_key` in testing Vault is rotated to the testing token.
- `functions_base_url` in testing Vault points to `https://bbcllewcotypedqsnwmi.supabase.co`.
- Production and testing schema fingerprints matched when testing was created: 99 columns, 54 functions, 25 indexes, 15 policies, 174 migrations.
- Deleted refs `ngtsnskyupageagcmqdp` and `ghzcsmscsympfxknubcp` must never be used.

---

## Step-by-Step: Adding a New Migration

### 1. Create the migration file

Create `supabase/migrations/YYYYMMDDHHMMSS_short_description.sql` with full timestamp.

**Example:** `20260301120000_add_payment_notes.sql`

```sql
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS payment_notes TEXT;
```

**Naming rules:**
- Use full timestamp: `YYYYMMDDHHMMSS` (e.g. `20260301120000`)
- Use snake_case: `add_payment_notes`, not `addPaymentNotes`
- Never edit or delete migrations already applied on production

### 2. Open a PR and let Supabase Preview migrate testing

Push the migration file to a feature branch and open/update its PR. The Supabase GitHub integration applies pending migrations to the associated testing branch. The custom migration workflow does **not** run on pull requests.

Do not manually apply the migration first with MCP. Doing so creates migration-history drift between the file timestamp and the preview deployment.

### 3. Verify on testing

- Confirm the **Supabase Preview** check passed.
- Run smoke tests against the Vercel Preview linked to testing.
- Verify RLS and function behavior with the testing project (`bbcllewcotypedqsnwmi`).
- Run Supabase security/performance advisors for schema changes.
- Confirm all testing cron jobs remain inactive.

### 4. Open PR

```bash
git add supabase/migrations/YYYYMMDDHHMMSS_short_description.sql
git commit -m "feat(db): short description"
git push -u origin feature-branch
```

Open PR. Supabase Preview and Vercel Preview must pass before merge. Production remains unchanged.

### 5. Merge to main

Merge. The push to `main` triggers `deploy-supabase-migrations.yml`, which applies pending migrations to production. Edge Function changes are deployed to production by `deploy-supabase-functions.yml`, also only from `main`.

---

## What Not to Do

- Do **not** run ad-hoc SQL on production without a migration file in Git
- Do **not** edit or delete migration files already applied on production
- Do **not** run `supabase db reset` on production
- Do **not** run files under `supabase/migrations/rollback/` on production unless you know why
- Do **not** call deleted refs `ngtsnskyupageagcmqdp` or `ghzcsmscsympfxknubcp`
- Do **not** enable testing cron while its Vault service-role token is production-scoped

---

## Migrations Requiring Vault Secrets

Some migrations (e.g. cron jobs) use `vault.decrypted_secrets`. Secrets must be set **per environment** manually via the Supabase Dashboard (never in git).

### Required Vault Secrets

| Name | Production | Testing |
|------|-----------|-------------------------|
| `functions_base_url` | `https://flpzqbvbymoluoeeeofg.supabase.co` | `https://bbcllewcotypedqsnwmi.supabase.co` |
| `service_role_key` | service_role JWT from Project Settings → API | Must be rotated to the testing token before cron is enabled |

### How to Add

**Dashboard (recommended – secret never touches git):**
Dashboard → Project Settings → Vault → New Secret

**Or via SQL (only if value is not sensitive to log):**
```sql
SELECT vault.create_secret('<value>', '<name>', '<description>');
```

### Which cron jobs use vault secrets

| Cron job | Vault secrets used |
|----------|--------------------|
| `daily-recurring-executor` | `functions_base_url`, `service_role_key` |

---

## Edge Functions

Pull requests deploy changed functions to testing through Supabase Preview. Production gets functions via GitHub Action (`deploy-supabase-functions.yml`) only on push to `main` when `supabase/functions/**` changes. Do not run the production deployment script from a feature branch.

**CI allowlist:** `deploy-changed-functions.sh` only deploys names in `ALL_FUNCTIONS` (and redeploys `SHARED_DEPENDENT` when `_shared` changes). A new function that is not listed is skipped with a warning — CI can still be green while production returns **404** on that path (browsers often surface this as a CORS preflight failure). See `supabase-edge-functions-maintenance.md` §4.

---

## References

- `supabase/MIGRATION_VAULT_SETUP.md` – Full list of required Vault secrets per environment
