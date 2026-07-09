# PostHog Integration — What Was Done (July 2026)

This document records the PostHog (PH) product analytics work on Ten10. Use it when extending instrumentation, debugging events, or onboarding.

**Related:**

- In-app financial analytics (`/analytics` page) — see `analytics-page-guide.md`
- Dashboard / PostHog AI brief — see `posthog-dashboard-brief.md` (paste into PostHog AI)

**PostHog project:** `posthog-ten10` on `eu.posthog.com` (project id 169449)

---

## Key Decisions

1. **Web only** — PostHog does not init when `window.__TAURI_INTERNALS__` exists (desktop).
2. **Landing dual tracking** — Keep GA; add PostHog in the same `trackEvent()` helper.
3. **No canvas recording** — Charts are Recharts (SVG).
4. **No financial PII in events** — Never send amounts, descriptions, recipients in event properties.
5. **Replay privacy: mask values, keep chrome** — Prefer `ph-mask` / `data-ph-mask` + `maskAllInputs` over `ph-no-capture` wrappers.
6. **Surveys** — API survey + opt-in **button → dialog** on Home (no auto-open / no popover).
7. **Admin** — Live aggregates via Edge Function `get-posthog-analytics` (Personal API key server-side only).

---

## Architecture

```
main.tsx (sync, before React render)
  └─ isPostHogSupported()? → initPostHog() + capturePostHogPageview()
  └─ router.subscribe("onResolved", capturePostHogPageview)
  └─ PostHogProvider (web only)

posthogClient.ts          posthogIdentity.service.ts    productAnalytics.ts
  ├─ initPostHog            └─ syncPostHogUserIdentity     └─ trackProductEvent
  ├─ capturePostHogPageview
  ├─ capturePostHogEvent    ← landing
  ├─ identifyPostHogUser
  └─ resetPostHogUser

posthogSurveys.ts         HomeFeedbackCard.tsx
  └─ survey shown/sent/dismissed → PostHog survey 019f46de-…

Admin: posthogAdmin.service.ts → Edge Function get-posthog-analytics → PostHog Query API
```

### Web-only gate

```typescript
isPostHogSupported() =
  typeof window !== "undefined" &&
  !window.__TAURI_INTERNALS__ &&
  !!VITE_PUBLIC_POSTHOG_PROJECT_TOKEN
```

---

## Environment Variables

**Client (Vercel / `.env`):**

```bash
VITE_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_...
VITE_PUBLIC_POSTHOG_HOST=https://eu.i.posthog.com
```

**Edge Function secrets (Supabase):**

```bash
POSTHOG_PERSONAL_API_KEY=phx_...   # Query Read permission
POSTHOG_PROJECT_ID=169449
POSTHOG_HOST=https://eu.posthog.com
```

Deploy function:

```bash
npx supabase functions deploy get-posthog-analytics
```

---

## SDK Configuration (`posthogClient.ts`)

| Option | Value | Why |
|--------|-------|-----|
| `person_profiles` | `"identified_only"` | Profiles only after identify |
| `capture_pageview` | `false` | Manual SPA pageviews |
| `capture_pageleave` | `true` | Engagement metrics |
| `capture_exceptions` | `true` | Error Tracking |
| `session_recording.maskAllInputs` | `true` | Mask input values |
| `session_recording.maskTextSelector` | `[data-ph-mask], .ph-mask` | Mask displayed amounts/text |
| `maskCapturedNetworkRequestFn` | redacts token/email query params | Safer replays |

**Session replay** must also be enabled in [project settings](https://eu.posthog.com/project/169449/settings/project-replay).

---

## Session Replay Privacy Rules

| Do | Don't |
|----|-------|
| Put `ph-mask` / `data-ph-mask` on **values** (amounts in tables, KPIs) | Wrap entire form sections in `ph-no-capture` |
| Rely on `maskAllInputs` for inputs | Block chart SVG containers |
| Use `ph-no-capture` only for true blocks (e.g. PIN UI) | Send amounts in event properties |

Applied on: `CurrencyConversionInfo`, import review amounts, dashboard StatCard values. Form inputs rely on `maskAllInputs`.

---

## Event Taxonomy

All product events go through `trackProductEvent()` in `productAnalytics.ts`. Full table for dashboards: **`posthog-dashboard-brief.md`**.

Highlights of expanded events:

- Auth: `signup_completed`, `login_completed`, `logout_completed`, `password_reset_requested`, `terms_accepted`
- Transactions: `transaction_deleted`, recurring pause/resume/update/delete
- Export: `transactions_exported`
- Settings: `settings_changed`, `reminder_preference_changed`
- Other: `category_created`, `contact_form_submitted`

---

## Surveys (Home opt-in button → dialog)

- PostHog survey ID: `019f46de-28a2-0000-6426-155935ed61c6` (type **API**, launched)
- UI: `src/components/feedback/HomeFeedbackCard.tsx` in `Sidebar` (above profile)
- Helpers: `src/lib/analytics/posthogSurveys.ts`
- Eligibility: identified web user + more than 10 transactions + survey not completed locally
- UX: button opens dialog on click only (no auto-show)
- Source answers store **stable English keys** (`friend_family`, `groups`, `mailing_list`, `forums`, …); labels via i18n
- When source is `other`, free text is required and sent as event property `source_other_text`
- i18n: sidebar label in `navigation.json` (`menu.feedback`); dialog copy in `common.json` (`feedback.*`)

---

## Web Analytics

Powered by existing `$pageview` captures. Open [Web Analytics](https://eu.posthog.com/project/169449/web-analytics). GA on landing remains.

---

## Admin PostHog tab

- Route: `/admin` → tab **PostHog**
- UI: `AdminPostHogSection.tsx`
- Backend: `supabase/functions/get-posthog-analytics`
- Shows aggregates only (DAU, pageviews, import success, exceptions, survey counts, top paths)
- Links to Web Analytics / Surveys / Error Tracking

---

## How to Add a New Event

1. Add name to `ProductAnalyticsEvent` in `productAnalytics.ts`
2. Call `trackProductEvent("event_name", { ... })` after success
3. Non-sensitive properties only
4. Update this guide + `posthog-dashboard-brief.md`

---

## Verification Checklist

- [ ] Web: Network tab shows `eu.i.posthog.com`
- [ ] Desktop: **no** PostHog network requests
- [ ] Login → identified person; logout → reset
- [ ] Replay: form chrome visible; amounts masked via `ph-mask`
- [ ] Home feedback card on 2nd+ visit; dismiss hides it
- [ ] Admin PostHog tab loads (after secrets + function deploy)
- [ ] Exceptions appear in Error Tracking

---

## Manual PostHog Setup

1. Session Replay enabled
2. Exception autocapture / Error Tracking enabled
3. Survey launched (done: Ten10 Home Feedback)
4. Create dashboards from `posthog-dashboard-brief.md` (PostHog AI or MCP)

---

## Not Implemented (future)

| Feature | Notes |
|---------|-------|
| Feature Flags | Ready when needed |
| Experiments | Needs more traffic |
| Workflows / alerts | Configure in PostHog UI |
| CDP / warehouse | Out of scope |
| PostHog on desktop | Explicitly excluded |
