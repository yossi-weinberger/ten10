# Receipts eval set

The synthetic receipts eval set is archived outside this repo. Point `AI_RECEIPTS_DIR` at a local copy with the same layout as the old `supabase/functions/_shared/ai/fixtures/receipts/` folder.

Created 2026-10-30. Every receipt was built from data, so that data is the gold answer. All details are fictional: business names, company IDs, phones, addresses, and card numbers.

## Folder layout

| Files | Count | What |
|---|---|---|
| `images/rcpt-he-*.png` | 40 | Hebrew till receipts: supermarket, pharmacy, fuel, restaurant, housewares |
| `images/rcpt-en-*.png` | 15 | English receipts: 9 from the US in USD, 6 from Europe in EUR |
| `images/inv-*.pdf` | 10 | Tax invoice / receipt: 6 Hebrew, 4 English |
| `images/don-*` | 5 | Donation receipts: 4 Hebrew (section 46), 1 English |
| `images/multi-*.png` | 5 | Two or three receipts in one image |
| `images/stmt-*` | 5 | Bank statement or card statement |
| `print/print-sheet.pdf` | 15 | Clean print version of 15 receipts, for printing and photographing |

The 66 PNG files have photo effects: rotation, 3 upside down, 3 strongly tilted, 8 faded, 8 blurred, 6 in perspective, and 23 with uneven lighting. The PDFs are clean, like a document downloaded from email.

## Answers

`answers.jsonl` is one line per file, in the same format as the blind sentence set, plus `file` and `kind`:

```json
{"id":"rcpt-he-17","file":"images/rcpt-he-17.png","kind":"receipt","language":"he","note":"he-pharm,discount,return-date","today":"2026-10-30","expected":{"route":"several","ask":null,"items":[{"description":"Pharm Galilee","amount":293.3,"amount_text":"293.30","currency":"ILS","date":"2026-10-20","type":"expense","type_question":null,"payment_method":"credit_card"}]}}
```

- **`kind`:** `receipt` (one item), `several` (one item per receipt in the image), `statement` (`route` is `list`, and `items` is empty).
- **`amount`:** what was actually paid. That is the total due or `TOTAL`: after discount, including tip, and in the US including tax.
- **`date`:** purchase or document date. Not the return date, not the due date, not the service period, and not the section-46 confirmation expiry.
- **`description`:** the business name. As in `split-score.ts`, it is not part of the comparison.
- **`note`:** what the file checks. Of the 80 files:
  - 17 with a discount, 9 with a tip, 12 cash with change.
  - 16 with a return date, 4 with a due date, 2 with a service period.
  - 8 with litres or gallons, 8 with a thousands separator, 5 with the amount also in words.
  - 5 with a date where dd/mm and mm/dd differ: 3 from the US (mm/dd) and 2 from Europe (dd/mm).

`answers-photos.jsonl` holds answers for later phone photos. Print IDs: rcpt-he-01, 04, 09, 15, 17, 21, 24, 28, 36, rcpt-en-02, 06, 12, don-he-01, 02, and multi-he-01.

Do not fit the prompt to these files. They are a test set, not examples.

Pass threshold (approved 2026-10-30): amount at least 98%, date at least 97%.

## How to run

Set `AI_RECEIPTS_DIR` to the absolute path of that folder. Both runners throw if it is unset or missing.

Receipt eval (copy to text, then `ai-split-items`):

```bash
export AI_RECEIPTS_DIR=/absolute/path/to/receipts
deno run --allow-env --allow-read --allow-write --allow-net \
  --config supabase/functions/deno.json \
  supabase/functions/_shared/ai/receipt-eval-run.ts \
  anthropic/claude-sonnet-5 /path/to/.env receipt-eval.json
```

The results file name is written under `supabase/functions/_shared/ai/fixtures/out/` (gitignored).

Client-side latency on the testing project:

```bash
export AI_RECEIPTS_DIR=/absolute/path/to/receipts
deno run --allow-env --allow-read --allow-write --allow-net \
  --config supabase/functions/deno.json \
  supabase/functions/_shared/ai/testing-latency-run.ts \
  /path/to/testing.env
```

Writes `fixtures/out/testing-latency.json`.

## Regenerating the set

`tools/gen.mjs` and `tools/check.mjs` are not in this repo. They live in the receipts archive, next to `images/` and `answers.jsonl`. Generation is deterministic (fixed seed). `check.mjs` checks that every `amount_text` and every date appears on the rendered page, and that no date is in the future.
