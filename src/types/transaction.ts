// Remove circular import of Currency from store.ts

// Define the possible currency types
export type Currency = "ILS" | "USD" | "EUR" | "GBP"; // Added other common currencies

// Define the possible types for a transaction
export type TransactionType =
  | "income"
  | "donation"
  | "expense"
  | "exempt-income"
  | "recognized-expense"
  | "non_tithe_donation"; // Renamed from donation_from_personal_funds

// Array of literal types for Zod enum
export const TransactionTypeValues: [TransactionType, ...TransactionType[]] = [
  "income",
  "donation",
  "expense",
  "exempt-income",
  "recognized-expense",
  "non_tithe_donation",
];

export interface RecurringInfo {
  id: string;
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  status: "active" | "paused" | "completed" | "cancelled";
  execution_count: number;
  total_occurrences?: number | null;
  day_of_month?: number | null;
}

// Define the core Transaction interface
export interface Transaction {
  id: string; // Unique identifier (nanoid)
  user_id?: string | null; // From Supabase auth, optional for desktop
  date: string; // ISO 8601 date string (YYYY-MM-DD)
  amount: number;
  currency: "ILS" | "USD" | "EUR";
  description: string | null;
  type: TransactionType;
  category: string | null;
  created_at?: string; // ISO 8601 date string
  updated_at?: string; // ISO 8601 date string

  // Type-specific fields
  is_chomesh?: boolean | null;
  recipient?: string | null;

  // Link to the recurring definition
  source_recurring_id?: string | null;
  recurring_info?: RecurringInfo | null;
  occurrence_number?: number | null;

  // DEPRECATED - to be removed after migration
  is_recurring?: boolean | null;
  recurring_day_of_month?: number | null;
  recurring_total_count?: number | null;
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
  currency: string;
  type: TransactionType;
  category?: string;
  is_chomesh?: boolean;
  recipient?: string;
  created_at?: string;
  updated_at?: string;
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
