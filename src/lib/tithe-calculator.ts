import { Transaction, TransactionType } from "../types/transaction";

/**
 * Calculates the total required tithe donation balance based on a list of transactions.
 *
 * @param transactions - An array of Transaction objects.
 * @returns The calculated required donation balance. Can be negative, indicating a surplus.
 */
export const calculateTotalRequiredDonation = (
  transactions: Transaction[]
): number => {
  let balance = 0;

  for (const transaction of transactions) {
    switch (transaction.type) {
      case "income":
        // Add 10% or 20% (if is_chomesh is true) of the income amount.
        // Default to 10% if is_chomesh is not explicitly set (though it should be for income type).
        balance += transaction.amount * (transaction.is_chomesh ? 0.2 : 0.1);
        break;
      case "donation":
        // Subtract the full donation amount.
        balance -= transaction.amount;
        break;
      case "recognized-expense":
        // Subtract 10% of the recognized expense amount.
        balance -= transaction.amount * 0.1;
        break;
      case "expense":
      case "exempt-income":
        // These types do not affect the tithe balance.
        break;
      default:
        // Optional: Log a warning for unknown transaction types if necessary
        // console.warn(`Unknown transaction type encountered: ${transaction.type}`);
        break;
    }
  }

  return balance;
};
