import type { TransactionType } from "@/types/transaction";
import type { ImportRowIssue } from "./import-session.types";
import { INCOME_DESCRIPTION_KEYWORDS, TYPE_LOCALE_ALIASES } from "./import-locale-aliases";

export interface ResolveTypeParams {
  amount: number;
  fromDebitCredit?: boolean;
  debitValue?: number | null;
  creditValue?: number | null;
  rawType?: string | null;
  description?: string | null;
  category?: string | null;
  recipient?: string | null;
  paymentMethod?: string | null;
}

export interface ResolvedTypeResult {
  type: TransactionType;
  issues: ImportRowIssue[];
}

/** Infer transaction type from explicit type, text hints, amount sign, or debit/credit columns. */
export function resolveTypeWithIssues(params: ResolveTypeParams): ResolvedTypeResult {
  const { amount, rawType } = params;

  if (rawType) {
    const key = rawType.trim().toLowerCase();
    if (key in TYPE_LOCALE_ALIASES) {
      const resolved = TYPE_LOCALE_ALIASES[key];
      if (resolved) return { type: resolved, issues: [] };
      // null means "recognized but non-importable" — fall through to sign inference
    }
  }

  if (amount < 0 && hasIncomeKeyword(params)) {
    return {
      type: "income",
      issues: [{ code: "income_keyword_match" }],
    };
  }

  // Infer from amount sign: positive → income, negative → expense
  if (amount > 0) return { type: "income", issues: [] };
  return { type: "expense", issues: [] };
}

/** Infer transaction type from amount sign or debit/credit column presence. */
export function resolveType(params: ResolveTypeParams): TransactionType {
  return resolveTypeWithIssues(params).type;
}

/** Check if a string is an importable transaction type (excludes special types). */
export function isImportableType(value: string): boolean {
  return ["income", "expense", "donation", "recognized-expense"].includes(value.toLowerCase().trim());
}

/** Check if a type string is a recognized but non-importable special type. */
export function isSpecialType(value: string): boolean {
  const special: TransactionType[] = [
    "exempt-income",
    "non_tithe_donation",
    "initial_balance",
  ];
  return special.includes(value as TransactionType);
}

function hasIncomeKeyword(params: ResolveTypeParams): boolean {
  const text = [
    params.description,
    params.category,
    params.recipient,
    params.paymentMethod,
    params.rawType,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (!text) return false;
  return INCOME_DESCRIPTION_KEYWORDS.some((keyword) => text.includes(keyword));
}
