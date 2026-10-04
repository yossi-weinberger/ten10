# Supabase Vault Setup

This file documents the secrets that must exist in the Supabase Vault for cron jobs and migrations to work correctly.

Secrets are managed via the **Supabase Dashboard → Project Settings → Vault** and are **never stored in git**.

---

## Required Secrets

### `functions_base_url`

Base URL for calling Edge Functions from cron jobs.

| Environment | Value |
|-------------|-------|
| Production  | `https://flpzqbvbymoluoeeeofg.supabase.co` |
| Testing     | `https://bbcllewcotypedqsnwmi.supabase.co` |

### `service_role_key`

The `service_role` JWT used to authenticate cron job requests to Edge Functions.

| Environment | Value |
|-------------|-------|
| Production  | service_role JWT from Dashboard → Project Settings → API |
| Testing     | service_role JWT from the testing branch API settings |

> **Security note:** This key bypasses Row Level Security. Never commit it to git.
> Always add it via the Dashboard UI.
> Testing currently contains a cloned production token. All testing cron jobs
> must remain disabled until that token is replaced with the testing token.

---

## Testing: email send guard

Every Edge Function SES send goes through `supabase/functions/_shared/email-guard.ts`.
Set these as **Edge Function secrets** (Dashboard → Edge Functions → Secrets), not Vault cron secrets.

| Secret | Purpose |
|--------|---------|
| `DRY_RUN` | When `true`, log a non-PII summary (recipient count, masked addresses like `a***@gmail.com`, subject, function name) and return a success-shaped `{ dryRun: true }` result without calling SES. |
| `EMAIL_ALLOWLIST` | Comma-separated emails, case-insensitive and trimmed. Recipients not on the list are dropped (dropped count is logged, not the addresses). If nothing remains, nothing is sent. |
| `EMAIL_ENV` | Optional override. `production` forces production send rules even if `SUPABASE_URL` is not the prod project. Any other value forces non-production rules. |

**How production is decided:** production only when `EMAIL_ENV=production` or, if `EMAIL_ENV` is unset, when `SUPABASE_URL` contains the production ref `flpzqbvbymoluoeeeofg`. The testing ref `bbcllewcotypedqsnwmi` is non-production.

**Fail-safe:** on a non-production project, if neither `DRY_RUN=true` nor a non-empty `EMAIL_ALLOWLIST` is set, nothing is sent (treated as dry-run) and a warning is logged. On production, leaving both unset keeps today's send-all behavior.

`{"test":true}` on `send-reminder-emails` only skips the reminder-day check. It cannot bypass this guard.

Contact-form and admin emails (`send-contact-email`, `send-cron-alerts`, `send-new-user-email`) are also held on testing unless the destination is allowlisted. That is intended.

---

## Cron Jobs That Use Vault

| Job name | Secrets used |
|----------|-------------|
| `daily-recurring-executor` | `functions_base_url`, `service_role_key` |
| `send-reminder-emails` | `functions_base_url`, `service_role_key` |
| `send-new-user-email-daily` | `functions_base_url`, `service_role_key` |
| `monitor-cron-failures` | `functions_base_url`, `service_role_key` |

---

## How to Verify Secrets Are Set

```sql
SELECT name FROM vault.decrypted_secrets ORDER BY name;
```

Expected output: `functions_base_url`, `service_role_key`
