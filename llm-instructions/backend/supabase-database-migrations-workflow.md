# Supabase Database Migrations – Workflow for LLMs

This document describes the full process for applying database changes (schema, RPC, cron, permissions) to the Ten10 Supabase project. **Always follow this workflow** when creating or modifying migrations.

## Overview

- **Staging first**: Apply migrations to staging, verify, then merge to main.
- **Production automatic**: After merge to `main`, GitHub Action runs `db push` on production.
- **Source of truth**: Migration files in `supabase/migrations/` must exist before applying.

---

## Environments

| Environment | Project Ref | Use |
|-------------|-------------|-----|
| **Production** | `flpzqbvbymoluoeeeofg` | Live app – updated via GitHub Action on merge |
| **Staging** | `ngtsnskyupageagcmqdp` | Test migrations before production |

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

### 2. Apply to staging

**Option A – MCP (recommended from Cursor)**

Use `plugin-supabase-supabase` with `project_id`:

- Staging: `ngtsnskyupageagcmqdp`
- Production: `flpzqbvbymoluoeeeofg`

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

### 3. Verify on staging

- Point `.env` to staging (uncomment staging vars, comment production)
- Run `npm run dev` and test the change
- If the migration involves Edge Functions: deploy to staging (`npx supabase functions deploy <name> --project-ref ngtsnskyupageagcmqdp`)

### 4. Commit and merge to main

```bash
git add supabase/migrations/YYYYMMDDHHMMSS_short_description.sql
git commit -m "feat(db): short description"
git push
```

Open PR, merge to `main`.

### 5. Production (automatic)

When `supabase/migrations/**` changes on `main`:

- GitHub Action `deploy-supabase-migrations.yml` runs
- Runs `supabase db push --linked` on production
- Applies only pending migrations (tracked in `schema_migrations`)

---

## What Not to Do

- Do **not** run ad-hoc SQL on production without a migration file in Git
- Do **not** edit or delete migration files already applied on production
- Do **not** run `supabase db reset` on production
- Do **not** run files under `supabase/migrations/rollback/` on production unless you know why

---

## Migrations Requiring Vault Secrets

Some migrations (e.g. cron with dynamic URL) use `vault.decrypted_secrets`. Set the secret **per environment** before or right after applying:

```sql
-- Production
SELECT vault.create_secret('https://flpzqbvbymoluoeeeofg.supabase.co', 'functions_base_url', 'Base URL for cron');

-- Staging
SELECT vault.create_secret('https://ngtsnskyupageagcmqdp.supabase.co', 'functions_base_url', 'Base URL for cron');
```

See `supabase/MIGRATION_VAULT_SETUP.md` for details.

---

## Edge Functions and Staging

Edge Functions are deployed per project. To test a function on staging:

```bash
npx supabase functions deploy <function-name> --project-ref ngtsnskyupageagcmqdp
```

Production gets functions via GitHub Action (`deploy-supabase-functions.yml`) on push to `main` when `supabase/functions/**` changes.

---

## References

- `supabase/BRANCHES_AND_CI_CD_MAP.md` – Full map of branches, CI/CD, and env toggle
- `supabase/MIGRATIONS_WORKFLOW.md` – Original workflow (manual `db push`)
- `supabase/MIGRATION_VAULT_SETUP.md` – Vault secrets for cron migrations
