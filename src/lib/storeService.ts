import { useDonationStore } from "./store";
import { Transaction } from "../types/transaction";
import {
  loadTransactionsFromBackend,
  addTransactionToBackend,
  clearAllTransactionsInBackend,
} from "./transactionService";

/**
 * Loads transactions from the backend and updates the Zustand store.
 */
export async function loadAndStoreTransactions(
  userIdFromAuthContext?: string
): Promise<void> {
  console.log("StoreService: Loading and storing transactions...");
  try {
    const transactions = await loadTransactionsFromBackend(
      userIdFromAuthContext
    );
    useDonationStore.getState().setTransactions(transactions);
    console.log(
      `StoreService: Successfully loaded and stored ${transactions.length} transactions.`
    );
  } catch (error) {
    console.error(
      "StoreService: Error loading and storing transactions:",
      error
    );
    // Optionally, clear transactions in store or set an error state
    useDonationStore.getState().setTransactions([]);
    throw error; // Re-throw for the caller to handle UI feedback if needed
  }
}

/**
 * Adds a transaction to the backend and then updates the Zustand store.
 */
export async function addTransactionAndUpdateStore(
  transaction: Transaction
): Promise<void> {
  console.log(
    "StoreService: Adding transaction and updating store...",
    transaction
  );
  try {
    const addedTransaction = await addTransactionToBackend(transaction);
    useDonationStore.getState().addTransaction(addedTransaction);
    console.log(
      "StoreService: Successfully added transaction and updated store:",
      addedTransaction.id
    );
  } catch (error) {
    console.error(
      "StoreService: Error adding transaction and updating store:",
      error
    );
    throw error; // Re-throw for the caller to handle UI feedback
  }
}

/**
 * Clears all data from the backend and then clears the Zustand store.
 */
export async function clearAllDataAndUpdateStore(): Promise<void> {
  console.log("StoreService: Clearing all data and updating store...");
  try {
    await clearAllTransactionsInBackend();
    // Clear the Zustand store (transactions)
    useDonationStore.setState({
      transactions: [],
      // Note: This does not clear other parts of the store like settings or serverCalculated balances.
      // If those also need clearing, it should be handled here or in separate functions.
    });
    console.log(
      "StoreService: Successfully cleared backend data and Zustand transaction store."
    );
  } catch (error) {
    console.error(
      "StoreService: Error clearing all data and updating store:",
      error
    );
    // Even if backend clear fails, we might still want to clear the local store,
    // or handle this based on the specific error.
    // For now, let's ensure the store is cleared if the function is called.
    useDonationStore.setState({ transactions: [] });
    throw error; // Re-throw for the caller to handle UI feedback
  }
}
