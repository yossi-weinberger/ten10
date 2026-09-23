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
