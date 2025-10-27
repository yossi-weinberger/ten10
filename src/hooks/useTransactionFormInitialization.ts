import { useSearch } from "@tanstack/react-router";
import { TransactionType } from "@/types/transaction";

export function useTransactionFormInitialization(isEditMode: boolean) {
  // Conditionally call the hook
  const search = !isEditMode
    ? useSearch({ from: "/add-transaction", strict: false })
    : {};

  const getInitialType = (): TransactionType => {
    if (
      !isEditMode &&
      "type" in search &&
      typeof search.type === "string" &&
      [
        "income",
        "expense",
        "donation",
        "exempt-income",
        "recognized-expense",
        "non_tithe_donation",
      ].includes(search.type)
    ) {
      return search.type as TransactionType;
    }
    return "income"; // Default type
  };

  return { search, getInitialType };
}
