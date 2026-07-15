# Secure Unsubscribe Flow Design

Date: 2026-07-15  
Status: Approved for implementation (user choice: option 1)

## Problem

`update_user_preferences(p_user_id, ...)` is `SECURITY DEFINER`, executable by `anon`, and accepts a caller-supplied user id. Token verification happens in a separate Edge Function call; the browser then updates preferences directly. Anyone with the anon key and a victim UUID can disable reminders without a valid unsubscribe token.

## Goal

Browser never chooses `user_id`. One Edge Function verifies the JWT and applies the preference update with `service_role`.

## Approach (phased, safe deploy)

### Phase 1 — this change (no DB grant lockdown yet)

1. Extend `verify-unsubscribe-token` to:
   - verify HMAC JWT (`JWT_SECRET`)
   - apply preference update via Supabase client with `SUPABASE_SERVICE_ROLE_KEY`
   - accept optional `type` override from body only when it matches token intent rules (prefer token `type`; allow URL `type` if token type matches or as today)
2. Change `UnsubscribePage` to a single `functions.invoke("verify-unsubscribe-token", { token, type })`.
3. Do **not** revoke RPC grants in this PR.

Why phase 1 has no migration: migrations auto-push to production on PR open, while Edge Functions deploy on merge to `main`. Locking grants before the new EF is live would break all unsubscribe links.

### Phase 2 — follow-up PR (after smoke on a real unsubscribe link)

Migration: `REVOKE` `update_user_preferences` from `PUBLIC` / `anon` / `authenticated`; `GRANT` to `service_role` only.

## Token / type semantics (preserve current behavior)

- Email links include `token` and `type` (`reminder` | `all`).
- Page currently uses URL `type` for which flags to clear.
- Token payload also carries `type`.
- Implementation: use body `type` if `reminder` | `all`, else fall back to payload `type`, else `all`. Update:
  - `reminder` → `reminder_enabled = false`
  - `all` → `mailing_list_consent = false`

## Success criteria

- Unsubscribe page works with one network call to the Edge Function.
- No browser RPC to `update_user_preferences`.
- Invalid/expired token → error response, no DB change.
- Reminder emails and other flows unchanged.

## Out of scope

- Vault / cron JWT cleanup
- Broader SECURITY DEFINER audit
- Staging reset
