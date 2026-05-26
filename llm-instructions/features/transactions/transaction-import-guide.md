# Transaction Import Feature Guide

## Overview

The transaction import feature allows users to import transactions from CSV or Excel (.xlsx) files into Ten10. The flow is **append-only and review-first** — no row is written to the database before explicit user approval.

## Entry Points

1. **Primary**: `TransactionsTableDisplay.tsx` — "Import Transactions" button next to the Export button, navigates to `/transactions-table/import`
2. **Secondary**: `AddTransactionPage.tsx` — button in the page header
3. **Settings**: `ImportExportDataSection.tsx` — separate from the JSON backup/restore section

## Route

`/transactions-table/import` — child of `transactionsTableRoute`, lazy-loaded as `TransactionImportPage`.

## Non-Negotiable Flow

```
File upload → Parse → Column mapping → Normalize → Validate
→ Import review / staging → User approval → DB insert (approved rows only)
→ Refresh affected data views
```

## File Structure

```
src/lib/import/
├── index.ts                     ← main pipeline + buildPreviewRows + computeImportSummary
├── import-session.types.ts      ← ImportPreviewRow, ImportNormalizedRow, ImportSummary, etc.
├── parsers.ts                   ← CSV parser (built-in, no papaparse) + ExcelJS parser
├── mapping.ts                   ← column mapping suggestions + validation
├── ten10-template.ts            ← Ten10 canonical template + CSV download (9 columns)
├── normalize.ts                 ← date/amount/currency/type normalization
├── type-resolver.ts             ← type inference from amount sign or rawType string
├── import-locale-aliases.ts     ← ALL locale-specific strings used during import parsing ← ADD HERE when supporting new languages
├── header-normalizer.ts         ← cleanHeaderName / normalizeHeaderName (strips BOM, Bidi, Hebrew punctuation)
├── validation.ts                ← row status computation + donation rules
├── duplicate-detector.ts        ← fingerprint-based dedup (CSV-specific, not the JSON-backup deduper)
├── recurring-warning-detector.ts
└── persist-approved-import.ts   ← Web (Supabase batch) + Desktop (Tauri) persistence
                                    also exports import preview data fetch helpers

src/lib/utils/
└── with-timeout.ts              ← shared Promise timeout wrapper (used by ImportWizard + FileUploadStep)

src/components/import/
├── ImportWizard.tsx             ← 5-step wizard orchestrator (useReducer state machine)
├── ImportRowEditModal.tsx       ← edit modal using TransactionForm with onOverrideSubmit
├── ImportReviewSummary.tsx      ← summary cards (counts + financial impact)
├── ImportReviewTable.tsx        ← desktop review table (memoized rows + select-all)
├── ImportReviewCards.tsx        ← mobile review cards
├── ImportRowStatusBadge.tsx     ← ready / needs_review / invalid badge
├── DuplicateWarning.tsx
├── RecurringWarning.tsx
├── ColumnMapper.tsx             ← column mapping UI
└── steps/
    ├── PrepareStep.tsx          ← format info + template download
    ├── FileUploadStep.tsx       ← react-dropzone + Tauri drag-drop handler
    ├── ColumnMappingStep.tsx
    ├── ImportReviewStep.tsx     ← filter tabs + bulk actions
    └── ImportResultStep.tsx
```

## Key Types

```typescript
type ImportRowStatus = "ready" | "needs_review" | "invalid";

interface ImportPreviewRow {
  id: string;           // nanoid, local only
  rowNumber: number;
  raw: Record<string, unknown>;
  mapped: ImportMappedRow;
  normalized?: ImportNormalizedRow;
  status: ImportRowStatus;
  issues: ImportRowIssue[];
  approved: boolean;
}

interface ImportNormalizedRow {
  date: string;         // ISO YYYY-MM-DD
  amount: number;       // always positive; type carries direction
  currency: Currency;   // only user's default currency accepted
  type: TransactionType;
  description: string | null;
  category: string | null;
  recipient: string | null;
  payment_method: string | null;
  is_chomesh: boolean;
  // All null for imports — no conversion, no recurring linking
  original_amount: null; original_currency: null;
  conversion_rate: null; conversion_date: null; rate_source: null;
  source_recurring_id: null; occurrence_number: null;
}
```

## CSV Parser

**No papaparse** — a custom lightweight CSV parser is in `parsers.ts`. It handles:
- UTF-8 BOM stripping
- CRLF/LF/CR normalization
- Quoted fields (with embedded commas and newlines)
- Escaped quotes (`""`)
- Auto-delimiter detection (comma, semicolon, tab)
- Hebrew headers

## Excel Parser

Uses `exceljs` (already in dependencies). Called with `ArrayBuffer` — works in browser.
Formula cells: cached result is used. The `formula_cell` issue is not currently emitted — formula metadata is tracked internally (via `__formula_*` flags) but no warning is surfaced to the user since cached values are treated as regular values.

Multi-sheet workbooks: initial upload uses a fast ZIP/XML reader (`listExcelSheetNames`) to list visible sheet names **without loading cell data through ExcelJS**. This avoids timeouts on large workbooks. The dropzone is hidden and the user is shown a sheet-selection card with a "choose different file" escape. Once a sheet is selected, ExcelJS loads and parses only that sheet.

Headerless files: when the first row looks like data (dates or amounts) rather than column headers, generic headers `Column 1`, `Column 2`, … are generated instead of blocking upload. A `generated_headers` diagnostic is surfaced in the mapping step so the user understands why column names are generic.

## Column Mapping

- `suggestMappings(headers)` — auto-detects English and Hebrew column names via aliases
- `detectTen10Template(headers)` — if file matches Ten10 template, shows a "auto-mapped" banner
- `validateMappings(mappings)` — errors: `dateMissing`, `amountMissing`, `duplicateTarget`, `amountAndDebitCredit`
- `date` and `amount` are **both required** (marked with `*` in UI)
- Ten10 template headers (Hebrew & English) defined in `TEN10_TEMPLATE_HEADERS`
- `description` is the only composable target field: multiple source columns may map to it, and non-empty values are joined in source-column order. All critical fields (`date`, `amount`, `debit`, `credit`, `currency`, `type`) remain one-to-one.
- `analyzeParsedFile(file, mappings)` returns advisory diagnostics for messy spreadsheets: duplicate/empty headers, many unmapped columns, multiple description candidates, amount + debit/credit ambiguity, and multi-sheet workbooks.

## Normalization Rules

- **Date**: parses ISO, DD/MM/YYYY, DD.MM.YYYY, Excel serial numbers
- **Amount**: handles `1,234.56`, `1.234,56`, `₪1,234`, `(123.45)` = negative, debit/credit columns, strips Bidi control characters
- **Amount stored**: always positive; `type` carries direction (income/expense/donation)
- **Type inference**: positive → income, negative → expense. Explicit type values from file are resolved via `TYPE_LOCALE_ALIASES` in `import-locale-aliases.ts`; unrecognized values fall through to sign inference
- **Income keyword rescue**: strong locale-configured income terms in text fields can classify debit-looking rows as `income` and add an `income_keyword_match` review warning so the user sees why the type changed before approving.
- **Recognized expenses**: explicit `recognized-expense` aliases are accepted from source type values, but the importer does not infer them silently from arbitrary text.
- **is_chomesh**: parsed from the `חומש?` / `is_chomesh` column using `BOOLEAN_TRUTHY_VALUES` from `import-locale-aliases.ts`
- **Foreign currency**: rows with a currency different from the user's default are marked `invalid` (not imported). No conversion, no auto-rates
- **Category**: normalized through `normalizeCategoryValue()` (maps Hebrew/English labels to stable keys). Donations: `category = null`
- **Donation recipient**: optional (matches existing form behavior)

## Locale Aliases System

The import pipeline has its **own** locale-string registry, separate from i18n (`public/locales/`). This is intentional:

- i18n goes **one direction**: key → display string (for UI)
- Import parsing goes **the other direction**: string-from-file → internal value
- These two concerns must stay separate

All locale-specific strings used during parsing are centralized in **`import-locale-aliases.ts`**:

```typescript
// TYPE_LOCALE_ALIASES — maps any recognized string to a TransactionType
TYPE_LOCALE_ALIASES["הכנסה"]  → "income"
TYPE_LOCALE_ALIASES["credit"] → "income"
TYPE_LOCALE_ALIASES["הוצאה"] → "expense"
// ...

// BOOLEAN_TRUTHY_VALUES — for is_chomesh and future boolean fields
["yes", "true", "1", "כן"]
```

**When adding a new language:** add the locale's parsing strings to `public/locales/<lang>/import.json` under the `parsing` section. The `import-locale-aliases.ts` file builds `TYPE_LOCALE_ALIASES`, `BOOLEAN_TRUTHY_VALUES`, and `FIELD_ALIASES` (column header aliases) automatically from those locale files — `type-resolver.ts`, `normalize.ts`, and the mapping flow then consume them without any other code changes.

## Template Columns

The downloadable template (`ten10-template.ts`) has 9 columns matching all importable Transaction fields:

| English key | Hebrew label | Notes |
|---|---|---|
| `date` | תאריך | required |
| `amount` | סכום | required |
| `description` | תיאור | |
| `currency` | מטבע | defaults to user's currency |
| `type` | סוג | income / expense / donation |
| `category` | קטגוריה | |
| `recipient` | נמען/משלם | for donations |
| `payment_method` | אמצעי תשלום | |
| `is_chomesh` | חומש? | yes/כן = true, anything else = false |

## Duplicate Detection

CSV-specific fingerprint (different from JSON backup dedup in `importPrepare.ts`):
```typescript
[date, amount, currency, type, description.slice(0,50), category]
```
Checks against: (1) existing DB transactions (fetched via `fetchExistingForDedup` before building preview rows), (2) within-batch duplicates.
Result: `possible_duplicate` warning issue → `needs_review` status, not selected by default.

## Approval Rules

| Status | Default selected | Can approve |
|---|---|---|
| `ready` | ✅ yes | ✅ yes |
| `needs_review` | ❌ no | ✅ yes (user explicitly selects) |
| `invalid` | ❌ no | ❌ no (checkbox disabled) |

## Persistence

### Web
- Fetch current user via `supabase.auth.getUser()`
- Batch insert with `WEB_IMPORT_BATCH_SIZE = 100` (from `importPrepare.ts`)
- No client-generated `id` (Supabase `gen_random_uuid()`)
- No `created_at`/`updated_at` (DB defaults)

### Desktop
- `nanoid()` for `id`
- `created_at`/`updated_at` set client-side
- Uses `import_desktop_data_bulk` with `mode: "merge"`, empty `recurring: []`

### Post-import refresh (both platforms)
```typescript
useDonationStore.getState().setLastDbFetchTimestamp(Date.now());
useTableTransactionsStore.getState().fetchTransactions(true, platform);
clearCategoryCache();       // if new categories were imported
clearPaymentMethodCache();  // if new payment methods were imported
```

## Row Editing During Review

Clicking "Edit" on a row opens `ImportRowEditModal` which wraps `TransactionForm` with:
- `isEditMode={true}` and `initialData` constructed from `ImportNormalizedRow`
- `onOverrideSubmit` — bypasses all DB writes; updates the preview row in memory
- On save: revalidates the row (re-runs `revalidateAfterEdit`)

**Important**: `TransactionForm` has an `onOverrideSubmit` prop (added for this feature) that, when provided, replaces the entire DB persistence path. Existing callers (`AddTransactionPage`, `TransactionEditModal`) do NOT pass this prop and are unaffected.

## Wizard State Machine

`ImportWizard.tsx` uses `useReducer` with these actions:
```
SET_STEP | FILE_PARSED | UPDATE_MAPPING | SET_MAPPING_ERRORS
SET_PREVIEW_ROWS | SET_PROCESSING_ERROR | UPDATE_ROW | TOGGLE_APPROVAL | BULK_TOGGLE
TOGGLE_ALL_READY | CLEAR_SELECTION | OPEN_CONFIRM | CLOSE_CONFIRM
IMPORT_START | IMPORT_DONE | RESET
```

The mapping → preview transition intentionally avoids `AnimatePresence` around the mapping subtree. Radix `SelectContent` uses portals, and unmounting portal-heavy mapping UI through exit animation can trigger browser DOM errors such as `removeChild` races. Preview generation is wrapped in a typed failure envelope: if dedupe/recurring fetches or `buildPreviewRows()` fail, the wizard stops loading and shows retry / back-to-mapping / start-over actions without losing the parsed file.

## Failure Handling

- Upload errors are typed (`too_large`, `too_many_rows`, `unsupported_format`, `xls_not_supported`, `parse_error`, `no_data`, `no_headers`, `parse_timeout`) and displayed through localized copy.
- Headerless files: instead of an error, generic `Column N` headers are generated and a `generated_headers` diagnostic is surfaced in the mapping step. The parser sets this diagnostic; the wizard merges it with mapping-analysis diagnostics from `analyzeParsedFile`.
- Dropzone rejections (wrong format, file too large dragged in) are handled before parsing, so rejected files still produce an actionable message. On desktop, Tauri `onDragDropEvent` enter/over/leave events drive the drag-active visual state since Tauri's WebView intercepts native drag events before they reach the DOM.
- Preview-building failures are represented by `ImportFlowError` codes and shown in a recovery state rather than leaving the user in an infinite loading state.
- Persistence failures return typed `ImportResultError` entries. Error reports contain codes/details only and must not include raw descriptions, recipients, amounts, filenames, or account-like values.
- Multi-sheet XLSX files prompt the user to choose a sheet before mapping, even if the first sheet is parseable.

## Performance

- `ReviewTableRow` is `React.memo` — only re-renders when its specific `row` reference changes
- `useOptimistic` on each checkbox for instant visual feedback before the reducer cycle completes
- Row edit state lives inside each memoized row (before the modal refactor, now in `ImportRowEditModal`)
- Table uses a native `<table>` element (not shadcn `<Table>`) to allow sticky `<thead>` with outer `overflow-auto` scroll

## Translation Namespace

`import` — **bundled** (not lazy-loaded), declared in `src/lib/i18n.ts` alongside `common`, `navigation`, etc.
Files: `public/locales/en/import.json`, `public/locales/he/import.json`

## Testing

Use Vitest for pure import-pipeline logic when tests are present in the branch. Keep tests close to the import module and run the targeted suite with `npx vitest run <path-to-import-tests>`.

Current focused coverage lives under `src/lib/import/__tests__/` and should include parser edge cases, mapping validation, multi-description composition, diagnostics, classification hints, and preview generation behavior.
