import type { Currency } from "@/types/transaction";
import { normalizeCategoryValue } from "@/lib/category-registry";
import {
  FILE_IMPORT,
  normalizeRow as normalizeRowCore,
  type ValidationProfile,
} from "../../../supabase/functions/_shared/transaction-domain/normalize-core.ts";
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
 * AI_DRAFT callers must not pass a foreign currency: the result type keeps
 * conversion fields null.
 * Category labels still go through i18n so a missing transactions bundle
 * leaves them as custom text.
 */
export function normalizeRow(
  mapped: ImportMappedRow,
  userDefaultCurrency: Currency,
  profile: ValidationProfile = FILE_IMPORT,
): NormalizeRowResult {
  return normalizeRowCore(mapped, userDefaultCurrency, profile, {
    normalizeCategory: normalizeCategoryValue,
  }) as NormalizeRowResult;
}
