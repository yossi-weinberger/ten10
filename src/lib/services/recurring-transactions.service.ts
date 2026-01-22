import { invoke } from "@tauri-apps/api/core";
import { RecurringTransaction, Transaction, TransactionType } from "@/types/transaction";
import { ExchangeRateService } from "./exchange-rate.service";
import { addTransaction } from "@/lib/data-layer/transactions.service";
import { useDonationStore } from "@/lib/store";
import { logger } from "@/lib/logger";
import { nanoid } from "nanoid";

export const RecurringTransactionsService = {
  async processDueTransactions() {
    try {
      logger.log("RecurringTransactionsService: Checking for due transactions...");
      const dueTransactions = await invoke<RecurringTransaction[]>("get_due_recurring_transactions_handler");
      
      if (!dueTransactions || dueTransactions.length === 0) {
        logger.log("RecurringTransactionsService: No due recurring transactions.");
        return;
      }

      logger.log(`RecurringTransactionsService: Found ${dueTransactions.length} due transactions.`);
      const defaultCurrency = useDonationStore.getState().settings.defaultCurrency;
      const today = new Date().toISOString().split("T")[0];

      for (const rec of dueTransactions) {
        try {
          let finalAmount = rec.amount;
          let finalCurrency = defaultCurrency;
          let originalAmount: number | null = null;
          let originalCurrency: string | null = null;
          let conversionRate: number | null = null;
          let conversionDate: string | null = null;
          let rateSource: "auto" | "manual" | null = null;

          if (rec.currency !== defaultCurrency) {
             // Need conversion
             const rate = await ExchangeRateService.fetchExchangeRate(rec.currency as any, defaultCurrency);
             
             if (rate) {
                 finalAmount = Number((rec.amount * rate).toFixed(2));
                 originalAmount = rec.amount;
                 originalCurrency = rec.currency;
                 conversionRate = rate;
                 conversionDate = today;
                 rateSource = "auto"; // Or "manual" if fetchExchangeRate returned last known? Service doesn't distinguish easily yet, but fetchExchangeRate usually tries API.
                 // Actually fetchExchangeRate returns last known if offline.
                 // We could check isOnline to be more precise about "auto" vs "manual" (or "estimated").
                 // For now "auto" is fine as it was automatic system action.
             } else {
                 logger.warn(`RecurringTransactionsService: Could not fetch rate for ${rec.currency} -> ${defaultCurrency}. Skipping transaction ${rec.id}.`);
                 continue;
             }
          } else {
              finalCurrency = defaultCurrency;
          }

          // Create new transaction
          const newTransaction: Transaction = {
              id: nanoid(),
              user_id: rec.user_id || null,
              date: rec.next_due_date, // Use the due date, not today
              amount: finalAmount,
              currency: finalCurrency as any,
              description: rec.description || null,
              type: rec.type,
              category: rec.category || null,
              is_chomesh: rec.is_chomesh || null,
              recipient: rec.recipient || null,
              source_recurring_id: rec.id,
              execution_count: rec.execution_count + 1, // This is for display? No, occurrence_number
              occurrence_number: rec.execution_count + 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              original_amount: originalAmount,
              original_currency: originalCurrency as any,
              conversion_rate: conversionRate,
              conversion_date: conversionDate,
              rate_source: rateSource
          };

          await addTransaction(newTransaction);

          // Update recurring transaction
          let nextDueDateObj = new Date(rec.next_due_date);
          if (rec.frequency === 'monthly') {
              nextDueDateObj.setMonth(nextDueDateObj.getMonth() + 1);
              if (rec.day_of_month) {
                  const year = nextDueDateObj.getFullYear();
                  const month = nextDueDateObj.getMonth();
                  const daysInMonth = new Date(year, month + 1, 0).getDate();
                  nextDueDateObj.setDate(Math.min(rec.day_of_month, daysInMonth));
              }
          } else if (rec.frequency === 'weekly') {
              nextDueDateObj.setDate(nextDueDateObj.getDate() + 7);
          } else if (rec.frequency === 'yearly') {
              nextDueDateObj.setFullYear(nextDueDateObj.getFullYear() + 1);
          } else if (rec.frequency === 'daily') {
              nextDueDateObj.setDate(nextDueDateObj.getDate() + 1);
          }

          const newNextDueDate = nextDueDateObj.toISOString().split('T')[0];
          const newExecutionCount = rec.execution_count + 1;
          const newStatus = (rec.total_occurrences && newExecutionCount >= rec.total_occurrences) ? 'completed' : 'active';

          await invoke("update_recurring_transaction_handler", {
              id: rec.id,
              updates: {
                  execution_count: newExecutionCount,
                  next_due_date: newNextDueDate,
                  status: newStatus
              }
          });

          logger.log(`RecurringTransactionsService: Processed recurring transaction ${rec.id}`);

        } catch (err) {
            logger.error(`RecurringTransactionsService: Error processing transaction ${rec.id}:`, err);
        }
      }
    } catch (error) {
      logger.error("RecurringTransactionsService: Error in processDueTransactions:", error);
    }
  }
}
