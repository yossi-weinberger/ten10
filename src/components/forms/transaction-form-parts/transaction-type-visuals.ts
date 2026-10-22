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
