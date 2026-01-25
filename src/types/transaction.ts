// Remove circular import of Currency from store.ts

// Define the possible currency types
export type Currency =
  | "ILS"
  | "USD"
  | "EUR"
  | "CAD"
  | "GBP"
  | "AUD"
  | "CHF"
  | "ARS"
  | "BRL"
  | "ZAR"
  | "MXN"
  | "UAH";

// Define the possible types for a transaction
export type TransactionType =
  | "income"
  | "expense"
  | "donation"
  | "exempt-income"
  | "recognized-expense"
  | "non_tithe_donation"
  | "initial_balance";

// Array of literal types for Zod enum
export const transactionTypes = [
  "income",
  "expense",
  "donation",
  "exempt-income",
  "recognized-expense",
  "non_tithe_donation",
  "initial_balance",
] as const;

export interface RecurringInfo {
  status: string;
  frequency: string;
  execution_count: number;
  total_occurrences: number | null;
  day_of_month: number;
  start_date: string;
  next_due_date: string;
}

// Define the core Transaction interface
export interface Transaction {
  id: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
  date: string; // ISO 8601 date string (e.g., "2023-10-27")
  amount: number;
  currency: Currency;
  description: string | null;
  type: TransactionType;
  category: string | null;
  is_chomesh: boolean | null;
  recipient: string | null;
  original_amount?: number | null;
  original_currency?: Currency | null;
  conversion_rate?: number | null;
  conversion_date?: string | null;
  rate_source?: "auto" | "manual" | null;
  source_recurring_id?: string | null; // UUID linking to the recurring_transactions table
  execution_count?: number | null; // e.g., 3 (for the 3rd payment)
  total_occurrences?: number | null; // e.g., 12 (for a total of 12 payments)
  recurring_status?: "active" | "paused" | "completed" | "cancelled" | null;
  recurring_frequency?: string | null;
  occurrence_number?: number | null;
}

export interface TransactionForTable extends Transaction {
  recurring_info: RecurringInfo | null;
}

export interface RecurringTransaction {
  id: string;
  user_id?: string | null; // Optional for desktop
  status: "active" | "paused" | "completed" | "cancelled";
  start_date: string; // ISO 8601 date string
  next_due_date: string; // ISO 8601 date string
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  day_of_month?: number; // For 'monthly'
  total_occurrences?: number;
  execution_count: number;
  description?: string;
  amount: number;
  currency: Currency;
  type: TransactionType;
  category?: string;
  is_chomesh?: boolean;
  recipient?: string;
  created_at?: string;
  updated_at?: string;
  // Currency Conversion Fields
  original_amount?: number | null;
  original_currency?: Currency | null;
  conversion_rate?: number | null;
  conversion_date?: string | null;
  rate_source?: "auto" | "manual" | null;
}

export type TransactionCategory =
  | "salary"
  | "bonus"
  | "commission"
  | "dividend"
  | "interest"
  | "rent"
  | "royalty"
  | "sale"
  | "service"
  | "tax"
  | "tip"
  | "transfer"
  | "utility"
  | "wage"
  | "other";

export type Status = "pending" | "completed" | "cancelled" | "failed";
