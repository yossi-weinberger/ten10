# Ten10 content library

Editorial content repository (verses, talmud, stories, humor, etc.) used as a **source of truth for copy**. Not UI i18n (`public/locales`) and not Edge email chrome (`supabase/functions/*/locales`).

## Files

| File | Role |
|------|------|
| `index.json` | Catalog only — id, type, title, topics, source, statuses. **Read this first.** |
| `ten10-content-master.md` | Full record bodies. Fetch only selected `TN10-XXXX` blocks. |
| `build-index.mjs` | Regenerates `index.json` from the master after edits. |
| `export-inspiration.mjs` | Regenerates `src/lib/ai/inspiration-library.json` for the assistant. |

## LLM / agent retrieval protocol

1. Read `content/library/README.md` (this file) and `index.json` — do **not** read the whole master.
2. Filter `records` by `type`, `topics`, and/or `id`.
3. For chosen ids only, open `ten10-content-master.md` and extract the section starting at `## TN10-XXXX` through the next `---`.
4. The whole library is approved for the assistant. `verification_status` and `text_status` are not used to choose an item.

## Regen index

```bash
node content/library/build-index.mjs
node content/library/export-inspiration.mjs
```

The inspiration export keeps every record except `halakha`, and folds a monthly email encouragement into its `contentId`. An email row without `contentId` becomes its own item. English email text is stored as `body_en` and `source_en` until the master file has its own English fields.

## Stable ids

Never renumber or reuse `TN10-XXXX` ids. Reorder in the master is fine; ids must stay stable so emails/site can reference them later.
