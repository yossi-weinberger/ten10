// Remove circular import of Currency from store.ts

// Define the possible currency types
export type Currency = "ILS" | "USD" | "EUR" | "GBP"; // Added other common currencies

// Define the possible types for a transaction
export type TransactionType =
  | "income"
  | "donation"
  | "expense"
  | "exempt-income"
  | "recognized-expense";

// Define the core Transaction interface
export interface Transaction {
  id: string; // Unique identifier (e.g., nanoid())
  user_id?: string | null; // Owner identifier (Crucial for Web/Supabase RLS, optional for Desktop/SQLite)
  date: string; // ISO 8601 format (YYYY-MM-DD)
  amount: number; // Positive value
  currency: Currency; // e.g., 'ILS', 'USD'. Defined in this file.
  description?: string | null; // User-provided description
  type: TransactionType;
  category?: string | null; // Optional category (mainly for expense types)
  created_at?: string; // Changed from createdAt
  updated_at?: string; // Changed from updatedAt

  // Type-specific fields - use optional chaining or type guards for access
  is_chomesh?: boolean; // Changed from is_chomesh
  recipient?: string | null; // Required for 'donation' type

  // Fields for recurring transactions
  is_recurring?: boolean; // Optional, defaults to false if not present
  recurring_day_of_month?: number | null; // Optional, relevant only if is_recurring is true
  recurring_total_count?: number | null; // Changed from recurringTotalCount
}
