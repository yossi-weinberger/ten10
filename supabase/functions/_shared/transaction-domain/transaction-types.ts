import {
  INCOME_DESCRIPTION_KEYWORDS,
  TYPE_LOCALE_ALIASES,
} from "./parsing-aliases.ts";

export const TRANSACTION_TYPES = [
  "income",
  "expense",
  "donation",
  "exempt-income",
  "recognized-expense",
  "non_tithe_donation",
  "initial_balance",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const FILE_IMPORT_ALLOWED_TYPES = [
  "income",
  "expense",
  "donation",
  "recognized-expense",
] as const satisfies readonly TransactionType[];

export const AI_DRAFT_ALLOWED_TYPES = [
  "income",
  "expense",
  "donation",
  "exempt-income",
  "recognized-expense",
  "non_tithe_donation",
] as const satisfies readonly TransactionType[];

export interface ValidationProfile {
  allowedTypes: readonly TransactionType[];
  foreignCurrency: "reject" | "convert";
}

export const FILE_IMPORT: ValidationProfile = {
  allowedTypes: FILE_IMPORT_ALLOWED_TYPES,
  foreignCurrency: "reject",
};

export const AI_DRAFT: ValidationProfile = {
  allowedTypes: AI_DRAFT_ALLOWED_TYPES,
  foreignCurrency: "convert",
};

const TRANSACTION_TYPE_SET = new Set<string>(TRANSACTION_TYPES);

function isTransactionType(value: string): value is TransactionType {
  return TRANSACTION_TYPE_SET.has(value);
}

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
  issues: { code: "income_keyword_match" }[];
}

/**
 * FILE_IMPORT recognizes types only through locale aliases, then the sign.
 * The canonical key "recognized-expense" is not an alias.
 * AI_DRAFT (foreignCurrency "convert") also accepts canonical keys that are
 * in allowedTypes, so exempt-income and non_tithe_donation can be explicit.
 * initial_balance stays out of AI_DRAFT.
 */
function acceptsCanonicalTypeKeys(profile: ValidationProfile): boolean {
  return profile.foreignCurrency === "convert";
}

/** Infer transaction type from explicit type, text hints, amount sign, or debit/credit columns. */
export function resolveTypeWithIssues(
  params: ResolveTypeParams,
  profile: ValidationProfile = FILE_IMPORT,
): ResolvedTypeResult {
  const { amount, rawType } = params;

  if (rawType) {
    const key = rawType.trim().toLowerCase();
    if (key in TYPE_LOCALE_ALIASES) {
      const resolved = TYPE_LOCALE_ALIASES[key];
      if (
        resolved &&
        isTransactionType(resolved) &&
        profile.allowedTypes.includes(resolved)
      ) {
        return { type: resolved, issues: [] };
      }
      // null means "recognized but non-importable" — fall through to sign inference
    } else if (
      acceptsCanonicalTypeKeys(profile) &&
      isTransactionType(key) &&
      profile.allowedTypes.includes(key)
    ) {
      return { type: key, issues: [] };
    }
  }

  if (amount < 0 && hasIncomeKeyword(params)) {
    return {
      type: "income",
      issues: [{ code: "income_keyword_match" }],
    };
  }

  if (amount > 0) return { type: "income", issues: [] };
  return { type: "expense", issues: [] };
}

/** Infer transaction type from amount sign or debit/credit column presence. */
export function resolveType(
  params: ResolveTypeParams,
  profile: ValidationProfile = FILE_IMPORT,
): TransactionType {
  return resolveTypeWithIssues(params, profile).type;
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
