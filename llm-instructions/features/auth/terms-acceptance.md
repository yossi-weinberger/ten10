# Terms of Service Acceptance System

This document describes the Terms of Service (ToS) and Privacy Policy acceptance mechanism implemented across both web and desktop platforms.

---

## Overview

Users must accept the current Terms of Service before using the application. This is enforced via a blocking modal that appears after authentication (web) or on app launch (desktop). The acceptance is tracked with full metadata for legal compliance.

---

## Key Files

- **Modal Component**: `src/components/auth/TermsAcceptanceModal.tsx`
- **Route Constants**: `src/lib/constants.ts`
- **Legal Pages**:
  - `src/pages/TermsPage.tsx`
  - `src/pages/PrivacyPage.tsx`
  - `src/pages/AccessibilityPage.tsx`
- **Translations**:
  - `public/locales/{lang}/auth.json` (modal strings)
  - `public/locales/{lang}/terms.json` (terms page content)
  - `public/locales/{lang}/privacy.json` (privacy page content)
- **Database Migration**: `supabase/migrations/20260101140000_add_terms_acceptance.sql`

---

## Route Constants (`src/lib/constants.ts`)

Centralized route definitions used across the application:

```typescript
// Routes accessible without authentication
export const PUBLIC_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/unsubscribe",
  "/landing",
  "/privacy",
  "/terms",
  "/accessibility",
];

// Routes that should ALWAYS be full screen (no sidebar), regardless of auth state
export const FULL_SCREEN_ROUTES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/landing",
];
```

**Usage:**

- `PUBLIC_ROUTES`: Used in `routes.ts` for authentication bypass and in `TermsAcceptanceModal.tsx` to prevent modal display on these pages.
- `FULL_SCREEN_ROUTES`: Used in `App.tsx` to control sidebar visibility.

---

## Platform-Specific Behavior

### Web (Supabase)

1. **Storage**: Acceptance is stored in the `profiles` table:

   - `terms_accepted_at`: `TIMESTAMPTZ` - Server timestamp of acceptance
   - `terms_version`: `TEXT` - Version string (e.g., "v1.0")
   - `terms_accepted_metadata`: `JSONB` - Additional metadata

2. **Check Logic**:
   - On every page load, the modal checks if the user has accepted the current version
   - If not, a blocking modal is displayed
   - Modal is NOT shown on `PUBLIC_ROUTES`

### Desktop (SQLite/Zustand)

1. **Storage**: Acceptance is stored locally in Zustand store (`settings.termsAcceptedVersion`)
2. **Check Logic**:
   - Checks local store for current version acceptance
   - No database call required
   - Single user per device assumption

---

## Metadata Collection

When a user accepts the terms, the following metadata is captured:

```typescript
const metadata = {
  local_time: new Date().toString(), // User's local time (full string)
  time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone, // e.g., "Asia/Jerusalem"
  user_agent: navigator.userAgent,
  platform: platform, // "web" or "desktop"
};
```

This ensures legal traceability with the user's local timezone and environment.

---

## Version Management

The current terms version is defined as a constant:

```typescript
const CURRENT_TERMS_VERSION = "v1.0";
```

When updating terms:

1. Update this constant (e.g., to "v1.1")
2. Update the `lastUpdated` in translation files
3. All users will be prompted to re-accept on next login

---

## UI/UX Notes

- **Non-dismissible**: Modal cannot be closed by clicking outside or pressing Escape
- **RTL Support**: Uses `text-start` for proper alignment in both LTR and RTL languages
- **Accessibility**: Links to Terms and Privacy pages open in new tabs
- **Responsive Design**: Uses Dialog (desktop) / Drawer (mobile) with **variant locking pattern** to prevent DOM errors when mobile keyboard changes viewport size. See `ui-component-guidelines.md` section 11 for details.

---

## Sidebar Visibility Logic

The sidebar visibility in `App.tsx` accounts for platform differences:

```typescript
const isFullScreenPage =
  FULL_SCREEN_ROUTES.includes(currentPath) ||
  (platform === "web" && !user && PUBLIC_ROUTES.includes(currentPath));
```

**Logic:**

- `FULL_SCREEN_ROUTES` are always full-screen (no sidebar) on all platforms
- On **Web**: Hide sidebar on public routes if user is not logged in
- On **Desktop**: User is always `null` (no auth), so sidebar is shown except on `FULL_SCREEN_ROUTES`

This ensures desktop users see the sidebar on `/terms`, `/privacy`, `/accessibility` pages.

---

## Database Schema

```sql
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS terms_version TEXT,
ADD COLUMN IF NOT EXISTS terms_accepted_metadata JSONB;
```

---

## Translations

### Modal Strings (`auth.json`)

Located at root level (NOT nested under `signup`):

```json
{
  "termsModal": {
    "title": "Terms of Service Update",
    "description": "Please read and accept...",
    "acceptButton": "I Accept",
    "accepting": "Accepting..."
  }
}
```

---

## Notes

- The terms acceptance flow applies to BOTH new signups AND existing users
- Google Sign-In users are also subject to this flow after OAuth completes
- Desktop version does not require re-acceptance after terms update (local-only tracking)

---

**Last Updated:** January 2026
**Status:** Active
