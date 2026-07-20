# Content library guide

How agents and developers should use the Ten10 editorial content repository.

## Location

```
content/library/
├── README.md                   # Short retrieval protocol
├── index.json                  # Metadata catalog (read first)
├── ten10-content-master.md     # Full text source of truth
└── build-index.mjs             # Regenerates index.json from the master
```

This is **product content** (verses, talmud, stories, humor, etc.), not:

- UI strings → `public/locales/{lang}/*.json` (i18next)
- Reminder email chrome / monthly encouragements currently shipped → `supabase/functions/send-reminder-emails/locales/`
- Dev/agent docs → `llm-instructions/` (this file)

## When to use it

Use the library when you need editorial snippets for:

- Email encouragement / “פינת החיזוק”
- In-app widgets or halacha-adjacent educational surfaces
- Landing or about copy that cites ma'aser sources
- Any future surface that should reference stable `TN10-XXXX` ids

Do **not** dump the master into a locale JSON file as a whole. Select records, then adapt into the consumer format.

## Retrieval protocol (mandatory for LLMs)

1. Read `content/library/README.md` and `content/library/index.json`.
2. Do **not** read all of `ten10-content-master.md` unless regenerating the index or doing a bulk editorial pass.
3. Filter `index.json` → `records` by:
   - `id` (exact)
   - `type` (e.g. `verse`, `talmud`, `humor`)
   - `topics` (e.g. `מעשר`, `צדקה`)
4. For each chosen id, extract only that section from the master:
   - Start: heading `## TN10-XXXX`
   - End: the following horizontal rule `---`
5. For user-facing product copy, prefer `verification_status` in `verified` / `verified_reference`. Use `humor` / `missing_source` only when the task explicitly wants that tone.

## Record shape

Index entries (metadata only):

| Field | Meaning |
|-------|---------|
| `id` | Stable id (`TN10-0001` …). Never renumber or reuse. |
| `type` | Category (`verse`, `talmud`, `commentary`, `story`, `humor`, …) |
| `title` | Short Hebrew title |
| `topics` | Search tags |
| `source` | Citation / attribution |
| `text_status` | e.g. `direct_source`, `adapted_from_source`, `humor` |
| `verification_status` | Pilot verification state |
| `original_location` | Line refs in the legacy import |

Full body text lives under `**content:**` in the master markdown only.

## Editing workflow

1. Edit or add records in `ten10-content-master.md` (keep `id` stable).
2. Regenerate the catalog:

   ```bash
   node content/library/build-index.mjs
   ```

3. Commit master + `index.json` together so they stay in sync.

## Future consumers

When wiring this into runtime (email Edge Function, website, etc.):

1. Keep `content/library/` as the editorial source of truth.
2. Publish a consumer-specific slice (e.g. 12 monthly encouragements) into the local JSON that the runtime already loads.
3. Optionally store `contentId: "TN10-0003"` next to the published copy so updates can be traced.

Until that pipeline exists, agents may copy selected `content` text manually into the target locale files — still via the index-first protocol above.

## Related docs

- Email reminder copy layout: `llm-instructions/features/email/email-reminders-feature-complete-guide.md`
- UI i18n map: `llm-instructions/ui/translation-map.md`
