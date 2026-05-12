import type { Currency, TransactionType } from "@/types/transaction";

export type ImportRowStatus = "ready" | "needs_review" | "invalid";

export type ImportTargetField =
  | "date"
  | "amount"
  | "debit"
  | "credit"
  | "description"
  | "currency"
  | "type"
  | "category"
  | "recipient"
  | "payment_method"
  | "is_chomesh";

export type ImportIssueCode =
  | "missing_required_field"
  | "invalid_date"
  | "invalid_amount"
  | "zero_amount"
  | "unsupported_currency"
  | "foreign_currency_not_supported"
  | "invalid_type"
  | "donation_recipient_required"
  | "possible_duplicate"
  | "possible_recurring"
  | "ambiguous_debit_credit"
  | "formula_cell";

export interface ImportRowIssue {
  code: ImportIssueCode;
  field?: string;
  /** Optional human-readable detail — NOT for display; resolved via i18n key in UI */
  detail?: string;
}

export interface ImportMappedRow {
  date?: unknown;
  amount?: unknown;
  debit?: unknown;
  credit?: unknown;
  description?: unknown;
  currency?: unknown;
  type?: unknown;
  category?: unknown;
  recipient?: unknown;
  payment_method?: unknown;
  is_chomesh?: unknown;
}

export interface ImportNormalizedRow {
  date: string;
  amount: number;
  currency: Currency;
  description: string | null;
  type: TransactionType;
  category: string | null;
  recipient: string | null;
  payment_method: string | null;
  is_chomesh: boolean;
  original_amount: null;
  original_currency: null;
  conversion_rate: null;
  conversion_date: null;
  rate_source: null;
  source_recurring_id: null;
  occurrence_number: null;
}

export interface ImportPreviewRow {
  id: string;
  rowNumber: number;
  raw: Record<string, unknown>;
  mapped: ImportMappedRow;
  normalized?: ImportNormalizedRow;
  status: ImportRowStatus;
  issues: ImportRowIssue[];
  approved: boolean;
}

export interface ColumnMapping {
  sourceColumn: string;
  targetField: ImportTargetField | null;
}

export interface ParsedSheet {
  sheetName: string;
  headers: string[];
  rows: Record<string, unknown>[];
}

export interface ParsedFile {
  headers: string[];
  rows: Record<string, unknown>[];
  /** First 5 rows for mapping preview */
  sampleRows: Record<string, unknown>[];
  sheetName?: string;
  availableSheets?: string[];
  rowCount: number;
}

export type ParseFileSuccess = {
  ok: true;
  file: ParsedFile;
};

export type ParseFileError = {
  ok: false;
  error:
    | "too_large"
    | "too_many_rows"
    | "unsupported_format"
    | "xls_not_supported"
    | "parse_error"
    | "no_data"
    | "no_headers";
  detail?: string;
  /** Internal debug hint — not shown in UI; useful for diagnosing why parsing failed. */
  diagnostic?: string;
};

export type ParseFileResult = ParseFileSuccess | ParseFileError;

export interface ImportResult {
  inserted: number;
  failed: number;
  skipped: number;
  errors: string[];
}

export interface ImportSummary {
  total: number;
  ready: number;
  invalid: number;
  needsReview: number;
  duplicateWarnings: number;
  recurringWarnings: number;
  /** Count of rows that have at least one issue with each code (any status) */
  issueCounts: Partial<Record<ImportIssueCode, number>>;
  approved: number;
  approvedIncome: number;
  approvedExpenses: number;
  approvedDonations: number;
  dateRangeMin: string | null;
  dateRangeMax: string | null;
}

export type MappingValidationError =
  | "dateMissing"
  | "amountMissing"
  | "duplicateTarget"
  | "amountAndDebitCredit";
