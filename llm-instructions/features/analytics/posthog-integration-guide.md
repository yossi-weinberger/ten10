# PostHog Integration — What Was Done (July 2026)

This document records the PostHog (PH) product analytics work on Ten10. Use it when extending instrumentation, debugging events, or onboarding.

**Related:** In-app financial analytics (`/analytics` page) is a separate feature — see `analytics-page-guide.md`. This doc covers **PostHog product analytics** only.

**PostHog project:** `posthog-ten10` on `eu.posthog.com` (project id 169449)

---

## Before vs After

### Before

| Area | State |
|------|-------|
| SDK | `posthog.init` inline in `main.tsx`; `$pageview` via TanStack Router |
| Events wired | Only 4 import events in `ImportWizard.tsx` |
| Events defined but unused | 6 events in `productAnalytics.ts` type union |
| Identity | No `identify` / `reset` |
| Session replay | Not configured in code |
| Desktop | PostHog was active (import events were sent) |
| Landing | Google Analytics only |
| Privacy policy | Claimed "no analytics in the app" (incorrect) |

### After

| Area | State |
|------|-------|
| SDK | Centralized in `posthogClient.ts`; web-only gate |
| Events | All 10 typed product events wired (see taxonomy below) |
| Identity | `identify` on login/session; `reset` on `SIGNED_OUT` only |
| Session replay | `maskAllInputs: true` in init (requires PH project settings) |
| Desktop | **No PostHog** — `isPostHogSupported()` returns false |
| Landing | Dual: GA + PostHog via `capturePostHogEvent` |
| Privacy | Minimal update in `privacy.json` (he/en) |

---

## Key Decisions

1. **Web only** — PostHog does not init when `window.__TAURI_INTERNALS__` exists (desktop). Aligns with privacy policy: desktop financial data stays local.
2. **Landing dual tracking** — Keep GA; add PostHog events in the same `trackEvent()` helper.
3. **No canvas recording** — Charts on `/analytics` are Recharts (SVG). Standard session replay is enough; `captureCanvas` was intentionally omitted.
4. **No financial PII in events** — Never send amounts, descriptions, recipients, or email.
5. **Minimal privacy copy** — One `description` + one `note` in `privacy.json`; no bullet list in UI.

---

## Files Changed

| File | Change |
|------|--------|
| `src/lib/analytics/posthogClient.ts` | **New** — init, guards, pageview, identify/reset, generic capture |
| `src/lib/analytics/productAnalytics.ts` | Web-only guard; removed desktop `app_surface` logic |
| `src/main.tsx` | Uses `posthogClient`; conditional `PostHogProvider` |
| `src/contexts/AuthContext.tsx` | `identifyPostHogUser` / `resetPostHogUser` |
| `src/lib/data-layer/transactionForm.service.ts` | `transaction_created`, `recurring_obligation_created` |
| `src/lib/data-layer/transactions.service.ts` | `transaction_updated` (after successful update) |
| `src/pages/AnalyticsPage.tsx` | `analytics_opened`, date range, PDF export events |
| `src/pages/landing/index.tsx` | `capturePostHogEvent` alongside GA |
| `src/components/forms/transaction-form-parts/AmountCurrencyDateFields.tsx` | `ph-no-capture` class (replay privacy, no visual change) |
| `src/components/forms/transaction-form-parts/DescriptionCategoryFields.tsx` | `ph-no-capture` class |
| `src/declarations.d.ts` | `VITE_PUBLIC_POSTHOG_*` env types |
| `public/locales/{he,en}/privacy.json` | Minimal PostHog mention |

**Not changed:** Business logic, UI styling, routes, Supabase, desktop data flow, Vercel Analytics.

---

## Architecture

```
main.tsx (sync, before React render)
  └─ isPostHogSupported()? → initPostHog() + capturePostHogPageview()
  └─ router.subscribe("onResolved", capturePostHogPageview)
  └─ PostHogProvider (web only)

posthogClient.ts          productAnalytics.ts
  ├─ initPostHog            └─ trackProductEvent (typed events)
  ├─ capturePostHogPageview
  ├─ capturePostHogEvent    ← landing page
  ├─ identifyPostHogUser    ← AuthContext
  └─ resetPostHogUser       ← AuthContext on SIGNED_OUT
```

### Web-only gate

```typescript
isPostHogSupported() =
  typeof window !== "undefined" &&
  !window.__TAURI_INTERNALS__ &&
  !!VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
```

If token is missing or platform is desktop, all PH calls no-op silently.

---

## Environment Variables

```bash
VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_...
VITE_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

Set in Vercel and local `.env` (not committed). Typed in `src/declarations.d.ts`.

---

## SDK Configuration (`posthogClient.ts`)

| Option | Value | Why |
|--------|-------|-----|
| `person_profiles` | `"identified_only"` | Person profiles only after `identify()` |
| `capture_pageview` | `false` | Manual SPA pageviews |
| `capture_pageleave` | `true` | Scroll/time metrics |
| `session_recording.maskAllInputs` | `true` | Mask form fields in replays |

**Manual pageviews:** `capturePostHogPageview()` runs once after init, then on every TanStack Router `onResolved`. Passes explicit `$current_url`.

**Session replay:** Must also be enabled in [PostHog project settings](https://eu.posthog.com/project/169449/settings/project-replay).

---

## User Identity (`AuthContext.tsx`)

```typescript
// Third argument to identify() = $set_once (PostHog ignores if already set)
identifyPostHogUser(user, i18n.language)
// → posthog.identify(user.id, { language }, { first_login_at: ISO })

resetPostHogUser()  // only on event === "SIGNED_OUT"
```

| Trigger | Action |
|---------|--------|
| Initial `getCachedSession()` with user | `identify` |
| `INITIAL_SESSION` with user | `identify` |
| `SIGNED_IN` | `identify` |
| `SIGNED_OUT` | `reset` |
| `TOKEN_REFRESHED` | nothing |

**Never send:** email, name, amounts, transaction descriptions.

---

## Event Taxonomy

All product events go through `trackProductEvent()` in `productAnalytics.ts`. Landing marketing events use `capturePostHogEvent()` directly.

| Event | File | Trigger | Properties |
|-------|------|---------|------------|
| `$pageview` | `posthogClient.ts` | Router navigation | `$current_url` |
| `transaction_created` | `transactionForm.service.ts` | After `addTransaction` | `type`, `currency`, `has_category`, `is_chomesh`, `has_conversion` |
| `transaction_updated` | `transactions.service.ts` | After successful `updateTransaction` | `fields_changed[]`, `type?` |
| `recurring_obligation_created` | `transactionForm.service.ts` | After `createRecurringTransaction` | `type`, `frequency`, `currency`, `has_category` |
| `analytics_opened` | `AnalyticsPage.tsx` | `useEffect` on mount | — |
| `analytics_date_range_changed` | `AnalyticsPage.tsx` | Preset or custom date change | `preset` |
| `analytics_pdf_exported` | `AnalyticsPage.tsx` | After PDF export success | `is_all_time`, `chart_count: 4` |
| `transaction_import_started` | `ImportWizard.tsx` | Wizard mount | `platform` (legacy prop; web-only now) |
| `transaction_import_mapping_completed` | `ImportWizard.tsx` | After mapping step | `platform`, `isTen10Template` |
| `transaction_import_completed` | `ImportWizard.tsx` | Import success | counts, `fileType`, `isTen10Template` |
| `transaction_import_failed` | `ImportWizard.tsx` | Import error | `platform`, `error` (truncated) |
| `download_click` | `landing/index.tsx` | Hero download button | `language`, `platform`, `section` |
| `web_app_click` | `landing/index.tsx` | Hero web app link | `language`, `section` |
| `language_view` | `landing/index.tsx` | Language change | `language` |

Every event includes `platform: "web"` when sent.

---

## Session Replay Privacy

`ph-no-capture` CSS class on input wrappers (PostHog default block class):

- `AmountCurrencyDateFields.tsx` — amount fields
- `DescriptionCategoryFields.tsx` — description, recipient, category

Do **not** add `ph-no-capture` to chart containers — Recharts SVG should remain visible in replays.

---

## Privacy Policy Text

`public/locales/he/privacy.json` and `en/privacy.json`, section `analytics`:

- **description:** GA (landing) + PostHog (web), no financial data, no desktop tracking
- **note:** cookies, can block in browser

Cookies section unchanged (GA landing only in item3). `PrivacyPage.tsx` layout unchanged (description + note paragraphs only).

---

## Pitfalls / Lessons Learned

### AnalyticsPage hook order (fixed)

`useCallback` handlers that call `setDateRangeSelection` must be declared **after** `useDateControls()`. Placing them before causes:

```
ReferenceError: Cannot access 'setDateRangeSelection' before initialization
```

### Do not reset on anonymous session

`resetPostHogUser()` only on `SIGNED_OUT`, not on `INITIAL_SESSION` without a user — avoids clearing anonymous distinct IDs unnecessarily.

### ImportWizard `platform` prop

Still passes `platform` in event properties from `usePlatform()`. On web this is always `"web"`. Harmless legacy; desktop no longer sends these events.

---

## Manual PostHog Setup (not in code)

1. Enable **Session Replay** in project settings
2. Optionally enable **Exception autocapture**
3. Create dashboards/funnels (suggested):
   - Login → Dashboard → `transaction_created`
   - Import funnel: `started` → `mapping_completed` → `completed`
   - Analytics adoption: pageview `/analytics` → `analytics_pdf_exported`

---

## Not Implemented (future)

| Feature | Notes |
|---------|-------|
| Feature flags | No flags in PH project yet |
| Surveys / NPS | — |
| `captureCanvas` | Only if canvas-based charts are added |
| PostHog on desktop | Explicitly excluded by policy |
| Replace GA on landing | Dual tracking chosen instead |
| PostHog dashboards in code | Manual setup in PH UI |

---

## How to Add a New Event

1. Add name to `ProductAnalyticsEvent` union in `productAnalytics.ts`
2. Call `trackProductEvent("event_name", { ... })` after the user action succeeds
3. Use only non-sensitive properties (see taxonomy rules above)
4. Update this document

For landing-only marketing events, use `capturePostHogEvent()` in `posthogClient.ts` instead.

---

## Verification Checklist

- [ ] Web: Network tab shows requests to `eu.i.posthog.com`
- [ ] Desktop (Tauri): **no** PostHog network requests
- [ ] Login → PostHog Persons shows identified user with `language`
- [ ] Logout → new anonymous session
- [ ] `/analytics` loads without errors; events fire on date change and PDF export
- [ ] Landing: GA + PostHog both receive `download_click`
- [ ] Session replay: charts visible, amount inputs masked
