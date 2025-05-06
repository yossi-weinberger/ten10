import { Currency } from "../lib/store"; // Import from store.ts where it's defined

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
  currency: Currency; // Defined in store (e.g., 'ILS', 'USD')
  description?: string | null; // User-provided description
  type: TransactionType;
  category?: string | null; // Optional category (mainly for expense types)
  created_at?: string; // ISO 8601 timestamp
  updated_at?: string; // ISO 8601 timestamp

  // Type-specific fields - use optional chaining or type guards for access
  is_chomesh?: boolean; // Required for 'income' type
  recipient?: string | null; // Required for 'donation' type

  // Fields for recurring transactions
  is_recurring?: boolean; // Optional, defaults to false if not present
  recurring_day_of_month?: number | null; // Optional, relevant only if is_recurring is true

  // Sync fields for cross-platform data migration
  original_id?: string; // To store original nanoid when imported to Supabase
  supabase_id?: string; // To store original Supabase UUID when imported to SQLite

  // Legacy camelCase aliases for backward compatibility - these will be removed in future
  isChomesh?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
