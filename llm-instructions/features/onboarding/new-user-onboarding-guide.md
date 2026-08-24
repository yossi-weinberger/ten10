# New-user onboarding (v1)

Short, optional first-run tour that gets a new user to their first saved transaction. Driver.js handles spotlight and step movement. TEN10 Dialog/Drawer components handle Welcome, success, and restart.

## Why Driver.js

Driver.js 1.8.0 is used only for what it is good at:

- spotlight and popover placement
- `advanceOnClick` on the Home CTA
- `waitForElement` after the `/add-transaction` route loads
- `skipMissingElement` so a missing target does not leave a stuck overlay
- future contextual hints (`driver.js/hints`) without adopting them in v1

Welcome, success, checklist, and restart stay in existing shadcn Dialog/Drawer/Card components.

## Architecture

```
src/lib/onboarding/           definition, eligibility, persistence, analytics
src/components/onboarding/    Welcome, success, checklist, OnboardingHost
data-onboarding attributes    stable targets in Home / Add Transaction / Sidebar
```

- **Tours:** `src/lib/onboarding/tours/firstRun.ts`
- **Orchestration:** `src/components/onboarding/OnboardingHost.tsx`
- **Persistence:** Zustand `settings.onboarding` only. `useSettingsSync` pushes the full `extractClientPreferences(settings)` object. Never call `pushPreferences({ onboarding })` — that replaces the entire JSONB.
- **Session:** `sessionStorage["ten10.onboarding.v1"] = "true"` means the tour is active now. Resume is route-based (`/` → Home steps, `/add-transaction` → form step).
- **Analytics:** `src/lib/onboarding/analytics.ts` → `trackProductEvent`. Web only.

## Versions

`CURRENT_ONBOARDING_VERSION = 1` in `src/lib/onboarding/constants.ts`.

Persistent status: `idle | started | skipped | completed` plus `version`.

- Skip or complete writes `version = 1`.
- A later version bump can offer a new tour to people who finished v1.
- Restart sets `status = started` and `tourActive = true`. It does not reset theme, language, terms, or `lastSeenVersion`.

Web first-run cutoff: `ONBOARDING_V1_ELIGIBLE_AFTER`. Accounts created before that instant never see v1, even with an empty ledger. Desktop has no auth user; empty local DB is treated as first-run.

## Persistence

Web source of truth after sync: `profiles.client_preferences.onboarding`.

Desktop: the same object inside SQLite `client_preferences` via `persistAllDesktopSettings`.

What's New on first-run is a dedicated column (`profiles.last_seen_version` / `settings.lastSeenVersion`), not JSONB. `extractClientPreferences` omits it. `markCurrentWhatsNewSeen` writes that column on Web and updates Zustand on both platforms.

## PostHog events

All events go through `trackProductEvent`. Properties are `version`, `tour_id`, and `step_id` only.

| Event | When |
| --- | --- |
| `onboarding_offered` | Welcome is shown |
| `onboarding_started` | User starts the tour |
| `onboarding_step_viewed` | Driver highlights a step |
| `onboarding_step_completed` | Driver leaves a step |
| `onboarding_skipped` | User skips Welcome |
| `onboarding_completed` | First transaction after `started` |
| `onboarding_restarted` | Settings restart |

Never send amounts, descriptions, recipients, emails, or other financial details.

Funnel: `signup_completed` → `onboarding_offered` → `onboarding_started` → `transaction_created` → `onboarding_completed`. Compare skipped vs completed people in PostHog.

Feature flag: `new-user-onboarding-v1`. Web fails closed (`isFeatureEnabled === true` required). Desktop has no PostHog and is on when eligible. Create the flag in PostHog UI; no experiment.

## Privacy

Same rules as `posthog-integration-guide.md`. PostHog stays Web-only. Desktop tour works; desktop sends no onboarding events.

## i18n

Lazy namespace `onboarding`: `public/locales/{en,he}/onboarding.json`. No hardcoded Hebrew in components. Driver popover gets `dir` from `i18n.dir()`. CTA popover `side` is `left` in RTL and `right` in LTR.

## Mobile / RTL

Do not target the Sidebar Add button. On small screens it lives in a closed Sheet; on `md+` the sidebar is collapsed to icons. The v1 CTA is a visible Home button (`data-onboarding="add-transaction-cta"`).

`.ten10-driver-popover` uses theme tokens and `max-width: min(22rem, calc(100vw - 1.5rem))`.

## How to add a step

1. Add a stable `data-onboarding="..."` on the target.
2. Extend `StepId` and `buildFirstRunSteps`.
3. Add copy to both locale files.
4. Keep the first-run tour to 3–4 steps.

## How to add a tour

Add a new builder under `src/lib/onboarding/tours/`. Wire it from `OnboardingHost` with its own version / eligibility. Do not grow `firstRun.ts` into a generic engine.

## How to add a contextual hint later

Use `data-onboarding` targets already in the tree (including `nav-add-transaction`). Import `driver.js/hints` when a real hint is needed. Do not add a hint engine in v1.

## How to change onboarding version

1. Bump `CURRENT_ONBOARDING_VERSION`.
2. People who skipped/completed an older version become eligible again if the other gates pass.
3. Update copy and steps for the new version.

## Debugging

- `logger.warn("[onboarding] Target missing...")` in development when Driver skips a selector.
- `sessionStorage["ten10.onboarding.v1"]` — tour active.
- `settings.onboarding` in the Zustand persist store.
- Restart from Settings → Version Information.

## Platform split

| Surface | Web | Desktop |
| --- | --- | --- |
| Tour / Welcome / checklist | Yes | Yes |
| Persistence | `client_preferences` + `last_seen_version` | SQLite settings |
| PostHog events / flag | Yes | No events; tour on if eligible |
| `created_at` cutoff | Yes | Not applicable |
