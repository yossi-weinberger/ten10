import {
  CreditCard,
  HandCoins,
  HeartHandshake,
  Landmark,
  ReceiptText,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { TransactionType } from "@/types/transaction";

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

export const TYPE_ICON: Record<TransactionType, LucideIcon> = {
  income: Wallet,
  "exempt-income": ShieldCheck,
  expense: CreditCard,
  "recognized-expense": ReceiptText,
  donation: HandCoins,
  non_tithe_donation: HeartHandshake,
  initial_balance: Landmark,
};

const FAMILY_CHIP: Record<BaseTransactionType, string> = {
  income: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  expense: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  donation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
};

const FAMILY_PANEL: Record<BaseTransactionType, string> = {
  income: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  expense: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  donation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
};

/** Chip colors: base family, except initial_balance which stays neutral gray. */
export const TYPE_CHIP: Record<TransactionType, string> = {
  income: FAMILY_CHIP.income,
  "exempt-income": FAMILY_CHIP.income,
  expense: FAMILY_CHIP.expense,
  "recognized-expense": FAMILY_CHIP.expense,
  donation: FAMILY_CHIP.donation,
  non_tithe_donation: FAMILY_CHIP.donation,
  initial_balance: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
};

/** Amount panel colors: base family, except initial_balance which stays neutral gray. */
export const TYPE_PANEL: Record<TransactionType, string> = {
  income: FAMILY_PANEL.income,
  "exempt-income": FAMILY_PANEL.income,
  expense: FAMILY_PANEL.expense,
  "recognized-expense": FAMILY_PANEL.expense,
  donation: FAMILY_PANEL.donation,
  non_tithe_donation: FAMILY_PANEL.donation,
  initial_balance: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
};

/** Any stored type (exempt-income, non_tithe_donation, …) by its base. Unknown types count as expenses. */
export function baseTypeOf(type: string): BaseTransactionType {
  if (type === "income" || type === "exempt-income" || type === "initial_balance") return "income";
  if (type === "donation" || type === "non_tithe_donation") return "donation";
  return "expense";
}
