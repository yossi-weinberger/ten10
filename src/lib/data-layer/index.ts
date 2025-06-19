import { useDonationStore } from "../store";
import { Transaction, RecurringTransaction } from "../../types/transaction";
import { TransactionFormValues } from "../../types/forms";
import {
  createRecurringTransaction,
  NewRecurringTransaction,
} from "./recurringTransactions.service";
import { nanoid } from "nanoid";
import { getPlatform } from "../platformManager";
import { supabase } from "@/lib/supabaseClient";

// The platform is no longer managed here. It is set once in App.tsx
// and retrieved via getPlatform() from the platformManager.

// --- All CRUD functions for Transactions (load, add, delete, update)
// --- and all calculation functions (fetch*) have been MOVED to their respective services.
// --- This file now contains higher-level logic and orchestrators.
// --- UPDATE: All orchestrator functions have been moved to their specific services.
// --- This file now acts solely as a facade to re-export functions from the data-layer.

// The handleTransactionSubmit function has been removed from this file.
// Its sole responsibility is now within transactionFormService.ts.

// Re-exporting functions from the new service files
// This allows other parts of the app to keep their existing imports from dataService.ts
// It acts as a facade, which can be a good pattern during refactoring.
export {
  loadTransactions,
  addTransaction,
  deleteTransaction,
  updateTransaction,
} from "./transactions.service";
export type { TransactionUpdatePayload } from "./transactions.service";

export {
  fetchTotalIncomeInRange,
  fetchTotalExpensesInRange,
  fetchTotalDonationsInRange,
  fetchServerTitheBalance,
} from "./analytics.service";
export type { ServerIncomeData, ServerDonationData } from "./analytics.service";

export {
  exportDataDesktop,
  importDataDesktop,
  exportDataWeb,
  importDataWeb,
  clearAllData,
} from "./dataManagement.service";

export {
  createRecurringTransaction,
  getRecurringTransactions,
} from "./recurringTransactions.service";
export type { NewRecurringTransaction } from "./recurringTransactions.service";
