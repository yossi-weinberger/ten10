# Secure Unsubscribe Flow Design

Date: 2026-07-15  
Status: Complete (Phase 1 + Phase 2 + response PII cleanup)

## Problem

`update_user_preferences(p_user_id, ...)` is `SECURITY DEFINER`, executable by `anon`, and accepts a caller-supplied user id. Token verification happens in a separate Edge Function call; the browser then updates preferences directly. Anyone with the anon key and a victim UUID can disable reminders without a valid unsubscribe token.

## Goal

Browser never chooses `user_id`. One Edge Function verifies the JWT and applies the preference update with `service_role`.

## Approach (phased, safe deploy)

### Phase 1 — done

1. Extend `verify-unsubscribe-token` to:
   - verify HMAC JWT (`JWT_SECRET`)
   - apply preference update via Supabase client with `SUPABASE_SERVICE_ROLE_KEY`
   - resolve unsubscribe `type` from the **signed token payload first**; use body/URL `type` only as fallback
2. Change `UnsubscribePage` to a single `functions.invoke("verify-unsubscribe-token", { token, type })`.
3. Do **not** revoke RPC grants in that PR (EF deploy lags FE / migrations).

### Phase 2 — this change

Migration: `REVOKE` `update_user_preferences` from `PUBLIC` / `anon` / `authenticated`; `GRANT` to `service_role` only.

Optional later cleanup: stop returning `userId` / `email` in the Edge Function JSON (kept for transitional clients).

### Response cleanup — done

Success response is `{ success: true, type }` only — no `userId` / `email` echoed to the browser.

## Token / type semantics

- Email links include `token` and `type` (`reminder` | `all`); each link uses a token minted for that same type.
- Implementation priority for apply logic:
  1. signed payload `type` if `reminder` | `all`
  2. else body `type` if `reminder` | `all`
  3. else `all`
- Updates:
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
