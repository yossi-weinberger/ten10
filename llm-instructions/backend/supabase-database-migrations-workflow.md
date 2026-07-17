# Supabase Database Migrations – Workflow for LLMs

This document describes the full process for applying database changes (schema, RPC, cron, permissions) to the Ten10 Supabase project. **Always follow this workflow** when creating or modifying migrations.

## Overview

- **DEV**: Create a versioned migration file in git.
- **PR**: Opening a PR triggers GitHub Action → `db push` to **production** (so you can test Vercel preview before merge).
- **Staging (optional):** There is **no always-on staging project**. The previous staging project was deleted to avoid idle compute cost. If you need a staging DB, recreate one first (see below), then apply there before opening the PR.
- **Only new migrations**: Do not modify history, legacy files, or applied migrations.

---

## Environments

| Environment | Project Ref | Use |
|-------------|-------------|-----|
| **Production** | `flpzqbvbymoluoeeeofg` | Live app – updated via GitHub Action on PR / push to main |
| **Staging** | *none (deleted)* | Recreate on demand when you need a safe pre-prod DB |

### Staging status (important)

- Former staging ref `ngtsnskyupageagcmqdp` is **gone** (project deleted).
- Do **not** assume staging MCP / that project ref still works.
- Default path today: write migration → open PR → production `db push` via CI → smoke on Vercel preview / production carefully.
- Prefer low-risk migrations (grants, indexes, additive DDL). For destructive or hard-to-revert changes, recreate staging first.

### Recreate staging (when needed)

1. Create a new Supabase project (same region as prod if possible).
2. Record the new project ref; update this doc, `.cursor/rules/supabase-database-migrations.mdc`, `.env` staging vars, and any staging MCP config.
3. Link CLI / push schema history: `supabase db push` (or apply migrations) against the new project.
4. Set Vault secrets (`functions_base_url`, `service_role_key`) for that project — see `supabase/MIGRATION_VAULT_SETUP.md`.
5. Deploy needed Edge Functions to the new ref for smoke tests.
6. Point local `.env` at staging URL/keys, run `npm run dev`, verify, then open the production PR as usual.

Pause or delete staging again when finished if you want to avoid ongoing cost.

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

### 2. Optional: apply to staging (only if a staging project exists)

If you recreated staging, apply there first with MCP or Dashboard.

**Option A – MCP (recommended from Cursor)**

Use `plugin-supabase-supabase` with the **current** staging `project_id` (after recreate). Never use production MCP (`user-supabase` / `flpzqbvbymoluoeeeofg`) to apply migrations.

```
apply_migration(project_id, name, query)  → Runs SQL + registers in schema_migrations
execute_sql(project_id, query)             → Runs SQL only (no registration)
```

**Important:** `apply_migration` uses an auto-generated timestamp. To align with the file in repo, run afterwards:

```sql
DELETE FROM supabase_migrations.schema_migrations WHERE version = '<auto-timestamp>';
INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
VALUES ('<file-timestamp>', '<file-timestamp>_<name>', ARRAY[]::text[]);
```

**Option B – Dashboard**

1. Supabase Dashboard → Staging project → SQL Editor
2. Run the migration SQL
3. Register it:
   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name, statements)
   VALUES ('YYYYMMDDHHMMSS', 'YYYYMMDDHHMMSS_short_description', ARRAY[]::text[])
   ON CONFLICT (version) DO NOTHING;
   ```

### 3. Verify

- With staging: point `.env` to staging, `npm run dev`, test.
- Without staging: rely on careful review + Vercel preview after PR open (production already received `db push` from CI).

### 4. Open PR

```bash
git add supabase/migrations/YYYYMMDDHHMMSS_short_description.sql
git commit -m "feat(db): short description"
git push -u origin feature-branch
```

Open PR. **On PR open (or sync):** GitHub Action runs `db push` to **production**. Verify Vercel preview works.

### 5. Merge to main

Merge. Production already has the migration from step 4. Push to main triggers the same Action (idempotent).

---

## What Not to Do

- Do **not** run ad-hoc SQL on production without a migration file in Git
- Do **not** edit or delete migration files already applied on production
- Do **not** run `supabase db reset` on production
- Do **not** run files under `supabase/migrations/rollback/` on production unless you know why
- Do **not** call staging project ref `ngtsnskyupageagcmqdp` — it no longer exists

---

## Migrations Requiring Vault Secrets

Some migrations (e.g. cron jobs) use `vault.decrypted_secrets`. Secrets must be set **per environment** manually via the Supabase Dashboard (never in git).

### Required Vault Secrets

| Name | Production | Staging (if recreated) |
|------|-----------|-------------------------|
| `functions_base_url` | `https://flpzqbvbymoluoeeeofg.supabase.co` | `https://<new-staging-ref>.supabase.co` |
| `service_role_key` | service_role JWT from Project Settings → API | service_role JWT from that project's API settings |

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

Production gets functions via GitHub Action (`deploy-supabase-functions.yml`) on push to `main` when `supabase/functions/**` changes.

If you recreated staging and need to test a function there:

```bash
npx supabase functions deploy <function-name> --project-ref <new-staging-ref>
```

**CI allowlist:** `deploy-changed-functions.sh` only deploys names in `ALL_FUNCTIONS` (and redeploys `SHARED_DEPENDENT` when `_shared` changes). A new function that is not listed is skipped with a warning — CI can still be green while production returns **404** on that path (browsers often surface this as a CORS preflight failure). See `supabase-edge-functions-maintenance.md` §4.

---

## References

- `supabase/MIGRATION_VAULT_SETUP.md` – Full list of required Vault secrets per environment
