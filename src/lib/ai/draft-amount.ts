import { parseAmount } from "../../../supabase/functions/_shared/transaction-domain/normalize-core.ts";

const AMOUNT_FIELD = /^[\d.,\s₪$€£]+$/;

/**
 * A typed amount in a card field. Thousand separators are read like the file import:
 * "1,500" is 1500 and "12,50" is 12.5. Letters, a minus sign, zero, or an empty field give null.
 */
export function parseDraftAmount(text: string): number | null {
  const trimmed = text.trim();
  if (!trimmed || !AMOUNT_FIELD.test(trimmed) || !/\d/.test(trimmed)) return null;
  const value = parseAmount(trimmed.replace(/\s/g, ""));
  return value !== null && Number.isFinite(value) && value > 0 ? value : null;
}
