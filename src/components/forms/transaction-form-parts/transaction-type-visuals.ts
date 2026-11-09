import { CreditCard, HandCoins, Wallet, type LucideIcon } from "lucide-react";

export type BaseTransactionType = "income" | "expense" | "donation";

export const BASE_TYPE_ICON: Record<BaseTransactionType, LucideIcon> = {
  income: Wallet,
  expense: CreditCard,
  donation: HandCoins,
};

export const BASE_TYPE_TINT: Record<BaseTransactionType, string> = {
  income: "bg-green-100 dark:bg-green-900",
  expense: "bg-red-100 dark:bg-red-900",
  donation: "bg-yellow-100 dark:bg-yellow-900",
};

/** The add-transaction form's background per type (TransactionForm `backgroundStyles`), with a matching border for cards. */
export const BASE_TYPE_SURFACE: Record<BaseTransactionType, string> = {
  income: "border-green-200/70 bg-green-50 dark:border-green-900/60 dark:bg-green-950",
  expense: "border-red-200/70 bg-red-50 dark:border-red-900/60 dark:bg-red-950",
  donation: "border-yellow-200/80 bg-yellow-50 dark:border-yellow-900/60 dark:bg-yellow-950",
};

/** The type's color for an icon on a plain or tinted surface. */
export const BASE_TYPE_TEXT: Record<BaseTransactionType, string> = {
  income: "text-success",
  expense: "text-destructive",
  donation: "text-warning dark:text-accent",
};

/** Any stored type (exempt-income, non_tithe_donation, …) by its base. Unknown types count as expenses. */
export function baseTypeOf(type: string): BaseTransactionType {
  if (type === "income" || type === "exempt-income" || type === "initial_balance") return "income";
  if (type === "donation" || type === "non_tithe_donation") return "donation";
  return "expense";
}
