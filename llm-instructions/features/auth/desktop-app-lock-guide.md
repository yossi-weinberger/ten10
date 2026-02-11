# Desktop App Lock Guide

This document summarizes the desktop App Lock architecture, recent fixes, current behavior, and operational guidance.

## Data Recovery Policy (Important)

- There is no support backdoor recovery path in the product.
- Recovery requires one of the following:
  - Correct app password, or
  - Valid recovery key.
- If a user has neither password nor recovery key, data is considered unrecoverable.
- This must be communicated consistently in setup, recovery, and full-reset UI copy.

## Scope

Desktop-only App Lock for the Tauri app:

- Password-protected vault using Stronghold.
- In-memory unlocked session.
- Recovery key verification/reset flow.
- Auto-lock based on inactivity timeout.

Main implementation files:

- `src/lib/security/appLock.service.ts`
- `src/components/security/DesktopLockScreen.tsx`
- `src/components/settings/AppLockSettingsCard.tsx`
- `src/App.tsx`
- `src-tauri/capabilities/migrated.json`

## Storage and Session Model

- Vault file: `$APPDATA/app_vault.hold`
- Recovery hash: `$APPDATA/recovery_key_hash.txt`
- Unlocked state is memory-only (`isUnlockedFlag` in service)
- App restart always resets unlocked session

Implication:

- Closing and reopening the app shows lock screen immediately when lock is enabled, regardless of timeout.

## Tauri Permissions (Critical)

App Lock relies on scoped FS permissions in `src-tauri/capabilities/migrated.json`.

Required scoped permissions (path: `$APPDATA/**`):

- `fs:allow-exists`
- `fs:allow-write-text-file`
- `fs:allow-read-text-file`
- `fs:allow-remove`

Why:

- `remove` is required for disable/reset/change-password flows.
- `readTextFile` is required for recovery key verification and password-change hash handling.

## Current Auto-Lock Behavior

Auto-lock is implemented in `src/App.tsx` and now uses real inactivity:

- Starts inactivity countdown when desktop is unlocked and timeout > 0.
- Resets timer on user activity events:
  - `mousemove`, `mousedown`, `keydown`, `touchstart`, `wheel`, `focus`
- On timeout:
  - Calls `lockNow()`
  - Updates UI lock state (`desktopLockStatus.unlocked = false`)
- On visibility return:
  - If timeout already elapsed, locks immediately.
  - Otherwise resumes with remaining time.

Important:

- Auto-lock is no longer dependent only on hidden/minimized state.
- The lock transition does not force `window.location.reload()` anymore.

## Performance Optimization Applied

### Removed reload on auto-lock

Previous behavior used full page reload after timeout, which delayed:

- Time to show lock screen.
- Time from password submit to restored UI.

Current behavior:

- Immediate state-based lock transition in `App.tsx`.
- Faster lock/unlock UX, while keeping Stronghold unload semantics from `lockNow()`.

### Unlock path simplification

`DesktopLockScreen.tsx` now calls `onUnlocked()` directly after successful `unlock(password)`, without redundant `isUnlocked()` check.

## UI Notes (Settings Card)

`AppLockSettingsCard.tsx` currently uses:

- Header-level lock toggle (`Switch`) for enable/disable intent.
- Confirmation dialog before disabling lock.
- Single-row action controls when lock is enabled.
- Auto-lock timeout as compact stepper (`- / value / +`) in the same control row.

Dialog RTL fixes included:

- `AlertDialogHeader/Title/Description` use `text-start`.
- `AlertDialogFooter/DialogFooter` use `gap-2 sm:space-x-0`.

## Functional Flows

### Enable lock

1. User sets password in settings dialog.
2. Service creates fresh Stronghold vault and recovery hash.
3. Session becomes unlocked immediately.
4. Recovery key is shown once to user.

### Disable lock

1. User triggers disable from settings toggle (with confirm dialog).
2. Service unloads Stronghold and removes vault/hash files.
3. Lock state becomes disabled.

### Change password

1. Requires unlocked session.
2. Preserves recovery hash.
3. Recreates vault under new password.

### Recovery reset

1. Verify recovery key hash.
2. Reset vault with new password.
3. Generate and show new recovery key.

## Known Constraints

- Timeout of `0` means disabled auto-lock.
- Session unlock is not persisted by design.
- If app remains active and user keeps generating activity, auto-lock does not trigger.

## Troubleshooting Checklist

If lock actions fail:

1. Verify capability file includes `fs:allow-remove` and `fs:allow-read-text-file` with `$APPDATA/**`.
2. Confirm app is desktop runtime (not web).
3. Check vault/hash file existence under app data path.
4. Check console logs around unlock/disable/reset flows.

If auto-lock does not trigger:

1. Ensure app lock is enabled and currently unlocked.
2. Ensure timeout > 0.
3. Confirm no activity events are firing continuously (mouse move noise, focus changes).
4. Validate `desktopInitComplete` is true.

## Future Improvements

- Optional "hard lock mode" that performs full app reset on lock (for stricter security posture).
- Debounce/throttle high-frequency activity events if needed.
- Optional configurable event set for accessibility scenarios.
- Integration test coverage for inactivity lock timing and unlock transition.
