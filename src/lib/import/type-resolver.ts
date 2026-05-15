import type { TransactionType } from "@/types/transaction";
import { TYPE_LOCALE_ALIASES } from "./import-locale-aliases";

/** Infer transaction type from amount sign or debit/credit column presence. */
export function resolveType(params: {
  amount: number;
  fromDebitCredit?: boolean;
  debitValue?: number | null;
  creditValue?: number | null;
  rawType?: string | null;
}): TransactionType {
  const { amount, rawType } = params;

  if (rawType) {
    const key = rawType.trim().toLowerCase();
    if (key in TYPE_LOCALE_ALIASES) {
      const resolved = TYPE_LOCALE_ALIASES[key];
      if (resolved) return resolved;
      // null means "recognized but non-importable" — fall through to sign inference
    }
  }

  // Infer from amount sign: positive → income, negative → expense
  if (amount > 0) return "income";
  return "expense";
}

/** Check if a string is an importable transaction type (excludes special types). */
export function isImportableType(value: string): boolean {
  return ["income", "expense", "donation"].includes(value.toLowerCase().trim());
}

/** Check if a type string is a recognized but non-importable special type. */
export function isSpecialType(value: string): boolean {
  const special: TransactionType[] = [
    "exempt-income",
    "recognized-expense",
    "non_tithe_donation",
    "initial_balance",
  ];
  return special.includes(value as TransactionType);
}
