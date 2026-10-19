# Growth attribution short links

Campaign emails and print ads use a short path on `ten10-app.com` (example: `/machon`) that redirects to `/landing` with a first-touch `ref` + UTM set.

Attribution is **PostHog-only**. Nothing is written to `profiles`. The client persists first-touch in `localStorage` (`ten10_attribution_first_touch`) so it still applies if PostHog initializes after the redirect (or after the user leaves `/landing?...`).

Desktop has no PostHog. Hash-style short-link URLs still persist first-touch locally; there is no arrival-code field.

## PostHog properties

Event / super properties (registered and explicitly attached to `signup_completed`):

- `ref`
- `utm_source`
- `utm_medium`
- `utm_campaign`

Person `$set_once`:

- `initial_ref`
- `first_touch_utm_source`
- `first_touch_utm_medium`
- `first_touch_utm_campaign`

`posthog-js` also auto-captures URL `utm_*` as `$initial_utm_*` when those params are still on the URL at first init (the usual `/landing?utm_…` case). `ref` is not a default campaign param; `initPostHog` sets `custom_campaign_params: ['ref']` so `$initial_ref` is captured the same way. Stored first-touch + `register` / `$set_once` covers late init.

No PII is sent. Capture still goes through `isPostHogSupported()` (web + project token; skipped on desktop and when the user has no token).

## Add a new short link

1. Add one entry to `SHORT_LINK_REGISTRY` in `src/lib/attribution/short-links.ts`:

```ts
forums: {
  code: "FORUMS",
  utm_source: "community",
  utm_medium: "post",
  utm_campaign: "spring_2027",
  target: "/landing",
},
```

2. Add matching `redirects` in `vercel.json` for `/{path}`, `/{path}/`, `/{PATH}`, and `/{PATH}/` → `/landing?ref=CODE&utm_source=...`.
3. `scripts/short-link-vercel-sync.test.ts` fails if the registry and `vercel.json` drift.
