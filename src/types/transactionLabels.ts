import type { TransactionType } from "./transaction";

export const transactionTypeLabels: Record<TransactionType, string> = {
  income: "הכנסה",
  donation: "תרומה",
  expense: "הוצאה",
  "exempt-income": "הכנסה פטורה",
  "recognized-expense": "הוצאה מוכרת",
};

export const typeBadgeColors: Record<TransactionType, string> = {
  income: "bg-green-100 text-green-800 border-green-300",
  expense: "bg-red-100 text-red-800 border-red-300",
  donation: "bg-yellow-100 text-yellow-800 border-yellow-400",
  "exempt-income": "bg-blue-100 text-blue-800 border-blue-300",
  "recognized-expense": "bg-orange-100 text-orange-800 border-orange-300",
};
