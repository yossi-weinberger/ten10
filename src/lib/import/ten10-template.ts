import type { ImportTargetField } from "./import-session.types";
import { TEMPLATE_COLUMN_LABELS, SAMPLE_ROWS_BY_LANG } from "./import-locale-aliases";

/** Ordered column keys for the downloadable template. */
export const TEN10_TEMPLATE_COLUMNS: ImportTargetField[] = [
  "date",
  "amount",
  "description",
  "currency",
  "type",
  "category",
  "recipient",
  "payment_method",
  "is_chomesh",
];

/**
 * Ten10 canonical template column names mapped to target fields.
 * Derived from TEMPLATE_COLUMN_LABELS — covers all supported locales.
 * Used for fast exact-match recognition when re-importing a Ten10 template.
 */
export const TEN10_TEMPLATE_HEADERS: Record<string, ImportTargetField> =
  Object.fromEntries(
    Object.values(TEMPLATE_COLUMN_LABELS).flatMap((labels) =>
      Object.entries(labels).map(([field, label]) => [label, field])
    )
  ) as Record<string, ImportTargetField>;

function csvEscape(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

/** Generate a CSV string for the downloadable template. */
export function generateTemplateCsv(language = "en"): string {
  const lang = TEMPLATE_COLUMN_LABELS[language] ? language : "en";
  const labels = TEMPLATE_COLUMN_LABELS[lang];
  const sampleRows = SAMPLE_ROWS_BY_LANG[lang] ?? SAMPLE_ROWS_BY_LANG.en;

  const headers = TEN10_TEMPLATE_COLUMNS.map((col) => csvEscape(labels[col] ?? col)).join(",");
  const rows = sampleRows.map((row) =>
    TEN10_TEMPLATE_COLUMNS.map((col) => csvEscape(row[col] ?? "")).join(",")
  );

  return [headers, ...rows].join("\n");
}

/** Trigger browser download of the template CSV. */
export function downloadTemplateCsv(
  language = "en",
  filename = "ten10-import-template.csv"
): void {
  const csv = generateTemplateCsv(language);
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
