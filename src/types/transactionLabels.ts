import type { TransactionType } from "./transaction";

export const transactionTypeLabels: Record<TransactionType, string> = {
  income: "הכנסה",
  donation: "תרומה",
  expense: "הוצאה",
  "exempt-income": "הכנסה פטורה",
  "recognized-expense": "הוצאה מוכרת",
  non_tithe_donation: "תרומה שאינה ממעשר",
  initial_balance: "יתרת פתיחה",
};

export const typeBadgeColors: Record<TransactionType, string> = {
  income: "bg-green-100 text-green-800 border-green-300",
  expense: "bg-red-100 text-red-800 border-red-300",
  donation: "bg-yellow-100 text-yellow-800 border-yellow-400",
  "exempt-income": "bg-blue-100 text-blue-800 border-blue-300",
  "recognized-expense": "bg-rose-100 text-rose-800 border-rose-300",
  non_tithe_donation: "bg-orange-100 text-orange-800 border-orange-300",
  initial_balance: "bg-gray-100 text-gray-800 border-gray-300",
};
