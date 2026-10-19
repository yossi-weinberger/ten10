# Campaign short links

`vercel.json` is the registry. Add one `redirects` entry per channel (Vercel `path-to-regexp` 6.1.0, case-sensitive). `(?i)` is not valid; put case-folding and an optional trailing slash in the regex group:

```json
{ "source": "/:path([Mm][Aa][Cc][Hh][Oo][Nn]/?)", "destination": "/landing?utm_source=institute&utm_medium=email&utm_campaign=update_2026", "permanent": false }
{ "source": "/:path([Ss][Tt][Aa][Tt][Uu][Ss]/?)", "destination": "/landing?utm_source=whatsapp&utm_medium=status&utm_campaign=status_2026", "permanent": false }
```

`/machon` is Vercel-only — there is no in-app or desktop route.

Count signups in PostHog on `signup_completed`: break down by event `utm_campaign` / `utm_source` (same session) or person `$initial_utm_campaign` / `$initial_utm_source` (first-touch, set on identify). `posthog-js` 1.438.5 already does this from the landing URL; `ref` is not used.
