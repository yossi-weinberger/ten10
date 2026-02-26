# Supabase Database Migrations – Workflow for LLMs

This document describes the full process for applying database changes (schema, RPC, cron, permissions) to the Ten10 Supabase project. **Always follow this workflow** when creating or modifying migrations.

## Overview

- **DEV**: Create migration file, push to staging via MCP, verify.
- **PR**: Opening a PR triggers GitHub Action → `db push` to **production** (so you can test Vercel preview before merge).
- **Staging**: MCP only (manual). No double push – staging gets it once via MCP.
- **Only new migrations**: Do not modify history, legacy files, or applied migrations.

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

- `supabase/MIGRATION_VAULT_SETUP.md` – Vault secrets for cron migrations
