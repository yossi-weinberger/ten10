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

/** Chip background + icon color for mobile card type visuals. */
export const TYPE_CHIP: Record<TransactionType, string> = {
  income: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300",
  "exempt-income": "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  expense: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
  "recognized-expense": "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
  donation: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300",
  non_tithe_donation: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  initial_balance: "bg-gray-100 text-gray-700 dark:bg-gray-900/40 dark:text-gray-300",
};

/** Amount panel background + amount text color for mobile card type visuals. */
export const TYPE_PANEL: Record<TransactionType, string> = {
  income: "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300",
  "exempt-income": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  expense: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300",
  "recognized-expense": "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300",
  donation: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300",
  non_tithe_donation: "bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300",
  initial_balance: "bg-gray-100 text-gray-800 dark:bg-gray-900/40 dark:text-gray-300",
};

/** Any stored type (exempt-income, non_tithe_donation, …) by its base. Unknown types count as expenses. */
export function baseTypeOf(type: string): BaseTransactionType {
  if (type === "income" || type === "exempt-income" || type === "initial_balance") return "income";
  if (type === "donation" || type === "non_tithe_donation") return "donation";
  return "expense";
}
