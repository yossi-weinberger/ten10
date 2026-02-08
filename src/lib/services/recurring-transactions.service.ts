// import { invoke } from "@tauri-apps/api/core"; // STATIC IMPORT REMOVED - using dynamic imports instead
import { RecurringTransaction, Transaction } from "@/types/transaction";
import { ExchangeRateService } from "./exchange-rate.service";
import { CurrencyCode } from "@/lib/currencies";
import { addTransaction } from "@/lib/data-layer/transactions.service";
import { useDonationStore } from "@/lib/store";
import { logger } from "@/lib/logger";
import { nanoid } from "nanoid";

import { getPlatform } from "@/lib/platformManager";

/**
 * Advances the due date based on frequency
 */
function advanceDueDate(
  currentDate: Date,
  frequency: string,
  dayOfMonth?: number
): Date {
  const newDate = new Date(currentDate);

  if (frequency === "monthly") {
    newDate.setMonth(newDate.getMonth() + 1);
    if (dayOfMonth) {
      const year = newDate.getFullYear();
      const month = newDate.getMonth();
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      newDate.setDate(Math.min(dayOfMonth, daysInMonth));
    }
  } else if (frequency === "weekly") {
    newDate.setDate(newDate.getDate() + 7);
  } else if (frequency === "yearly") {
    newDate.setFullYear(newDate.getFullYear() + 1);
  } else if (frequency === "daily") {
    newDate.setDate(newDate.getDate() + 1);
  }

  return newDate;
}

export const RecurringTransactionsService = {
  async processDueTransactions() {
    if (getPlatform() !== "desktop") {
      return;
    }

    try {
      logger.log(
        "RecurringTransactionsService: Checking for due transactions..."
      );

      // Dynamic import to avoid bundling Tauri in web builds
      const { invoke } = await import("@tauri-apps/api/core");

      // Fetch due transactions
      // Note: We might need to re-fetch inside the loop if we process them one by one,
      // but typically we can process 'until up to date' in memory for each definition.
      const dueTransactions = await invoke<RecurringTransaction[]>(
        "get_due_recurring_transactions_handler"
      );

      if (!dueTransactions || dueTransactions.length === 0) {
        logger.log(
          "RecurringTransactionsService: No due recurring transactions."
        );
        return;
      }

      logger.log(
        `RecurringTransactionsService: Found ${dueTransactions.length} due recurring definitions.`
      );

      // Ensure default currency is available
      const defaultCurrency =
        useDonationStore.getState().settings.defaultCurrency;
      if (!defaultCurrency) {
        logger.error(
          "RecurringTransactionsService: Default currency not set in store. Aborting."
        );
        return;
      }

      // Helper to parse "YYYY-MM-DD" string to a Date object at local midnight
      const parseLocal = (dateStr: string) => {
        const [year, month, day] = dateStr.split("-").map(Number);
        return new Date(year, month - 1, day); // Month is 0-indexed in JS Date
      };

      const today = new Date();
      // Reset time part to ensure clean comparison
      today.setHours(0, 0, 0, 0);

      for (const rec of dueTransactions) {
        try {
          // Use explicit parsing to avoid UTC vs Local timezone shifts
          let currentDueDate = parseLocal(rec.next_due_date);

          let executionCount = rec.execution_count;
          let currentStatus = rec.status;

          // Loop until the next due date is in the future
          while (currentDueDate <= today && currentStatus === "active") {
            // Safe ISO string generation for local date:
            // format manually to avoid UTC conversion shifts
            const year = currentDueDate.getFullYear();
            const month = String(currentDueDate.getMonth() + 1).padStart(
              2,
              "0"
            );
            const day = String(currentDueDate.getDate()).padStart(2, "0");
            const currentDueDateStr = `${year}-${month}-${day}`;

            logger.log(
              `RecurringTransactionsService: Processing ${rec.id} for date ${currentDueDateStr}`
            );

            // 1. Prepare Transaction Data
            let finalAmount = rec.amount;
            let finalCurrency = defaultCurrency;
            let originalAmount: number | null = null;
            let originalCurrency: string | null = null;
            let conversionRate: number | null = null;
            let conversionDate: string | null = null;
            let rateSource: "auto" | "manual" | null = null;

            // Check if the recurring transaction has stored conversion details
            if (
              rec.original_amount &&
              rec.original_currency &&
              rec.conversion_rate
            ) {
              // Has stored conversion from creation time

              if (rec.rate_source === "manual") {
                // MANUAL RATE: Always use the stored rate - user explicitly set it
                logger.log(
                  `RecurringTransactionsService: Using MANUAL rate for ${rec.id}`
                );
                finalAmount = rec.amount;
                finalCurrency = rec.currency;
                originalAmount = rec.original_amount;
                originalCurrency = rec.original_currency;
                conversionRate = rec.conversion_rate;
                conversionDate = rec.conversion_date || null;
                rateSource = "manual";
              } else {
                // AUTO RATE: Try to get fresh rate, fallback to stored rate
                const freshRate = await ExchangeRateService.fetchExchangeRate(
                  rec.original_currency as any,
                  defaultCurrency
                );

                if (freshRate) {
                  // Got fresh rate - use it
                  finalAmount = Number(
                    (rec.original_amount * freshRate).toFixed(2)
                  );
                  finalCurrency = defaultCurrency;
                  originalAmount = rec.original_amount;
                  originalCurrency = rec.original_currency;
                  conversionRate = freshRate;
                  conversionDate = new Date().toISOString().split("T")[0];
                  rateSource = "auto";
                  logger.log(
                    `RecurringTransactionsService: Using FRESH rate for ${rec.id}: ${rec.original_amount} ${rec.original_currency} -> ${finalAmount} ${defaultCurrency} (Rate: ${freshRate})`
                  );
                } else {
                  // No fresh rate - fallback to stored rate from creation
                  logger.warn(
                    `RecurringTransactionsService: No fresh rate available, using STORED rate for ${rec.id}`
                  );
                  finalAmount = rec.amount;
                  finalCurrency = rec.currency;
                  originalAmount = rec.original_amount;
                  originalCurrency = rec.original_currency;
                  conversionRate = rec.conversion_rate;
                  conversionDate = rec.conversion_date || null;
                  rateSource = "auto";
                }
              }
            } else if (rec.currency !== defaultCurrency) {
              // Legacy: no stored conversion details, try to fetch rate
              const rate = await ExchangeRateService.fetchExchangeRate(
                rec.currency as CurrencyCode,
                defaultCurrency
              );

              if (rate) {
                finalAmount = Number((rec.amount * rate).toFixed(2));
                originalAmount = rec.amount;
                originalCurrency = rec.currency;
                conversionRate = rate;
                conversionDate = new Date().toISOString().split("T")[0];
                rateSource = "auto";
                logger.log(
                  `RecurringTransactionsService: Legacy conversion ${rec.amount} ${rec.currency} -> ${finalAmount} ${defaultCurrency}`
                );
              } else {
                // Legacy without rate - this shouldn't happen with new transactions
                logger.error(
                  `RecurringTransactionsService: Legacy transaction ${rec.id} with no rate available - cannot convert!`
                );
                // Skip this occurrence and advance
                executionCount++;
                currentDueDate = advanceDueDate(
                  currentDueDate,
                  rec.frequency,
                  rec.day_of_month
                );
                if (
                  rec.total_occurrences &&
                  executionCount >= rec.total_occurrences
                ) {
                  currentStatus = "completed";
                }
                continue;
              }
            } else {
              // Same currency - no conversion needed
              finalCurrency = defaultCurrency;
            }

            // 2. Create Transaction
            const newTransaction: Transaction = {
              id: nanoid(),
              user_id: rec.user_id || null,
              date: currentDueDateStr, // Use the manually formatted local date string
              amount: finalAmount,
              currency: finalCurrency as any,
              description: rec.description || null,
              type: rec.type,
              category: rec.category || null,
              is_chomesh: rec.is_chomesh || null,
              recipient: rec.recipient || null,
              payment_method: rec.payment_method || null,
              source_recurring_id: rec.id,
              execution_count: executionCount + 1,
              occurrence_number: executionCount + 1,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              original_amount: originalAmount,
              original_currency: originalCurrency as any,
              conversion_rate: conversionRate,
              conversion_date: conversionDate,
              rate_source: rateSource,
            };

            await addTransaction(newTransaction);

            // 3. Advance to next occurrence
            executionCount++;
            currentDueDate = advanceDueDate(
              currentDueDate,
              rec.frequency,
              rec.day_of_month
            );
            if (
              rec.total_occurrences &&
              executionCount >= rec.total_occurrences
            ) {
              currentStatus = "completed";
            }
          }

          // 4. Update Recurring Definition in DB (after loop finishes or breaks)
          // We update with the final calculated state
          const year = currentDueDate.getFullYear();
          const month = String(currentDueDate.getMonth() + 1).padStart(2, "0");
          const day = String(currentDueDate.getDate()).padStart(2, "0");
          const newNextDueDate = `${year}-${month}-${day}`;

          await invoke("update_recurring_transaction_handler", {
            id: rec.id,
            updates: {
              execution_count: executionCount,
              next_due_date: newNextDueDate,
              status: currentStatus,
            },
          });

          logger.log(
            `RecurringTransactionsService: Finished processing ${rec.id}. New Next Due: ${newNextDueDate}, Count: ${executionCount}`
          );
        } catch (err) {
          logger.error(
            `RecurringTransactionsService: Error processing transaction ${rec.id}:`,
            err
          );
        }
      }
    } catch (error) {
      logger.error(
        "RecurringTransactionsService: Error in processDueTransactions:",
        error
      );
    }
  },
};
