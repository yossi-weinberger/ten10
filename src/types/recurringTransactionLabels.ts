import { z } from "zod";
import { transactionSchema } from "../lib/schemas";

export type Transaction = z.infer<typeof transactionSchema>;

export type TransactionType = "income" | "expense" | "donation";

export interface RecurringInfo {
  status: string;
  frequency: string;
  execution_count: number;
  total_occurrences?: number | null;
  day_of_month: number;
  start_date: string;
  next_due_date: string;
}

export const recurringStatusLabels: Record<string, string> = {
  active: "פעיל",
  paused: "מושהה",
  completed: "הושלם",
  cancelled: "בוטל",
};

export const recurringFrequencyLabels: Record<string, string> = {
  daily: "יומי",
  weekly: "שבועי",
  monthly: "חודשי",
  yearly: "שנתי",
};
