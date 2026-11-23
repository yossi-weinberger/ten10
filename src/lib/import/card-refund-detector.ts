import type { ImportMappedRow, ImportRowIssue } from "./import-session.types";
import { parseAmount } from "./normalize";

/**
 * Card exports map "סכום חיוב" to debit. A negative charge is a refund:
 * normalize still stores abs(amount) + expense, but the row must be reviewed
 * so the user picks income vs expense. Do not invent a new amount convention.
 */
export function checkCardRefund(mapped: ImportMappedRow): ImportRowIssue | null {
  if (mapped.debit === null || mapped.debit === undefined || mapped.debit === "") {
    return null;
  }
  const signed = parseAmount(mapped.debit);
  if (signed === null || signed >= 0) return null;
  return { code: "card_refund" };
}
