# Growth attribution short links

Campaign emails and print ads use a short path on `ten10-app.com` (example: `/machon`) that redirects to `/landing` with a first-touch `ref` + UTM set.

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
3. `src/lib/attribution/short-links.test.ts` fails if the registry and `vercel.json` drift.

The client reads `ref` / UTM on any entry page, stores first-touch in `localStorage`, and copies a valid optional arrival code onto `profiles` at signup. Desktop stores the code locally only (no central analytics).
