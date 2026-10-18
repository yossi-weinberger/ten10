import type { Currency } from "@/types/transaction";
import { normalizeCategoryValue } from "@/lib/category-registry";
import { FILE_IMPORT, normalizeRow as normalizeRowCore } from "../../../supabase/functions/_shared/transaction-domain/normalize-core.ts";
import type {
  ImportMappedRow,
  ImportNormalizedRow,
  ImportRowIssue,
} from "./import-session.types";

export {
  parseAmount,
  parseDate,
} from "../../../supabase/functions/_shared/transaction-domain/normalize-core.ts";

export interface NormalizeRowResult {
  normalized: ImportNormalizedRow | null;
  issues: ImportRowIssue[];
}

/**
 * File import keeps the current CSV rules: four types, and foreign currency
 * is a fatal foreign_currency_not_supported issue.
 * Category labels still go through i18n so a missing transactions bundle
 * leaves them as custom text.
 */
export function normalizeRow(
  mapped: ImportMappedRow,
  userDefaultCurrency: Currency,
): NormalizeRowResult {
  return normalizeRowCore(mapped, userDefaultCurrency, FILE_IMPORT, {
    normalizeCategory: normalizeCategoryValue,
  }) as NormalizeRowResult;
}
