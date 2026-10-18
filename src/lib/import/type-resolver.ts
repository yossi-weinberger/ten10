import type { TransactionType } from "@/types/transaction";

export type {
  ResolveTypeParams,
  ResolvedTypeResult,
} from "../../../supabase/functions/_shared/transaction-domain/transaction-types.ts";

export {
  resolveType,
  resolveTypeWithIssues,
} from "../../../supabase/functions/_shared/transaction-domain/transaction-types.ts";

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
