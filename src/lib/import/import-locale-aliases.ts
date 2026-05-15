import type { ImportTargetField } from "./import-session.types";
import type { TransactionType } from "@/types/transaction";

// =============================================================================
// LOCALE ALIAS AGGREGATOR
//
// All locale-specific strings live in the JSON translation files:
//   public/locales/<lang>/import.json  →  "parsing" section
//
// To add a new language:
//   1. Create public/locales/<lang>/import.json with a "parsing" section
//      (copy the structure from en/import.json)
//   2. Add its import below
//   3. Add it to LOCALE_ENTRIES
//
// No other code files need to change.
// =============================================================================

import import_en from "../../../public/locales/en/import.json";
import import_he from "../../../public/locales/he/import.json";

type LocaleParsing = (typeof import_en)["parsing"];

const LOCALE_ENTRIES: [string, LocaleParsing][] = [
  ["en", import_en.parsing],
  ["he", import_he.parsing],
];

const ALL_PARSING = LOCALE_ENTRIES.map(([, p]) => p);

// ---------------------------------------------------------------------------
// Template column labels  →  ten10-template.ts, mapping.ts (detectTen10Template)
// ---------------------------------------------------------------------------

export const TEMPLATE_COLUMN_LABELS: Record<
  string,
  Partial<Record<ImportTargetField, string>>
> = Object.fromEntries(
  LOCALE_ENTRIES.map(([lang, p]) => [lang, p.templateColumnLabels])
);

// ---------------------------------------------------------------------------
// Column header aliases  →  mapping.ts (FIELD_ALIASES / matchHeaderToField)
// ---------------------------------------------------------------------------

const FIELD_KEYS: ImportTargetField[] = [
  "date", "amount", "debit", "credit", "description",
  "currency", "type", "category", "recipient", "payment_method", "is_chomesh",
];

export const FIELD_ALIASES: Record<ImportTargetField, string[]> =
  Object.fromEntries(
    FIELD_KEYS.map((field) => [
      field,
      [
        ...new Set(
          ALL_PARSING.flatMap(
            (p) => (p.columnAliases as Record<string, string[]>)[field] ?? []
          )
        ),
      ],
    ])
  ) as Record<ImportTargetField, string[]>;

// ---------------------------------------------------------------------------
// Transaction type synonyms  →  type-resolver.ts
// Falsy value (null) means "not a real type — fall through to sign inference".
// ---------------------------------------------------------------------------

export const TYPE_LOCALE_ALIASES: Record<string, TransactionType | null> = {
  ...Object.fromEntries(
    ALL_PARSING.flatMap((p) =>
      Object.entries(p.typeAliases).flatMap(([type, aliases]) =>
        aliases.map((alias) => [alias, type as TransactionType])
      )
    )
  ),
  // Ten10 self-export label for a plain transaction — not a real type.
  // Keep hardcoded: it is a Ten10-internal term, not a locale string.
  רגילה: null,
};

// ---------------------------------------------------------------------------
// Boolean truthy values  →  normalize.ts (is_chomesh and future bool fields)
// ---------------------------------------------------------------------------

export const BOOLEAN_TRUTHY_VALUES: readonly string[] = [
  ...new Set(ALL_PARSING.flatMap((p) => p.booleanTruthy)),
];

// ---------------------------------------------------------------------------
// Template sample rows  →  ten10-template.ts
// ---------------------------------------------------------------------------

export const SAMPLE_ROWS_BY_LANG: Record<string, Record<string, string>[]> =
  Object.fromEntries(
    LOCALE_ENTRIES.map(([lang, p]) => [lang, p.templateSamples])
  );
