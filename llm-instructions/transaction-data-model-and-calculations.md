# Transaction Data Model and Calculation Guidelines

This document outlines the standard approach for handling financial transactions, data storage, and calculating the required tithe balance within the Ten10 application.

## 1. Unified Transaction Data Model (`Transaction`)

- A single interface/type named `Transaction` will represent all financial events (income, expenses, donations, etc.).
- **Core Fields**:
  - `id`: `string` (Unique identifier, e.g., `nanoid()`)
  - `user_id`: `string` (Identifier of the user who owns the transaction. **Crucial for Web/Supabase RLS.** Can be null/empty for Desktop/SQLite.)
  - `date`: `string` (ISO 8601 format, e.g., "YYYY-MM-DD")
  - `amount`: `number` (Positive value representing the transaction amount)
  - `currency`: `Currency` (Type defined in store, e.g., 'ILS', 'USD', 'EUR')
  - `description`: `string` (User-provided description)
  - `type`: `TransactionType` (Enum/string literal union, see below)
  - `category`: `string | null` (Optional category, primarily for 'expense' and 'recognized-expense' types)
  - `createdAt`: `string` (ISO 8601 timestamp, optional)
  - `updatedAt`: `string` (ISO 8601 timestamp, optional)
    // Recurring Transaction Fields (relevant for income/donation)
  - `is_recurring`: `boolean` (Optional, indicates if the transaction is a standing order)
  - `recurring_day_of_month`: `number | null` (Optional, day of month (1-31) for recurring transactions)
- **Transaction Type (`TransactionType`)**: Enum/string literal union defining the nature of the transaction and its impact on tithe calculation.
  - `'income'`: Regular income subject to tithe (10% or 20%). Requires `isChomesh: boolean`. Can be recurring.
  - `'donation'`: Includes donations, tzedakah, and mitzvah expenses permissible to be paid from tithe funds (e.g., tuition fees for religious studies). Reduces required tithe by 100% of the amount. Requires `recipient: string` (or similar field indicating purpose). Can be recurring.
  - `'expense'`: Regular expense (e.g., groceries, utilities). Does not affect tithe calculation.
  - `'exempt-income'`: Income inherently exempt from tithe (e.g., certain gifts, specific stipends, offset rental income). Does not affect tithe calculation. **Note:** Reimbursements for expenses are _not_ exempt income; they should reduce the amount of the original expense recorded (or the expense shouldn't be recorded if fully reimbursed).
  - `'recognized-expense'`: Business or work-related expenses that reduce the income base subject to tithe (e.g., travel, babysitting for work, business investments/ads). Reduces required tithe by 10% of the expense amount.
- **Specific Fields**: Fields relevant only to certain types (e.g., `isChomesh`, `recipient`) are defined in the interface but only populated when relevant.
  **UI Handling**: In the `TransactionForm`, subtypes like `exempt-income` and `recognized-expense` are handled via conditional checkboxes presented under the main `income` or `expense` type selections, simplifying the initial choice for the user while allowing for the necessary detail.

## 2. State Management (Zustand - `useDonationStore`)

- The primary state managed by the store related to financial data will be a single array: `transactions: Transaction[]`.
- The previous separate arrays (`incomes`, `donations`) will be removed.
- The calculated `requiredDonation` balance **will not** be stored directly in the Zustand state.

## 3. Balance Calculation Logic

- All logic for calculating the required tithe balance will reside in a dedicated utility file (e.g., `src/lib/tithe-calculator.ts`).
- A central function, e.g., `calculateTotalRequiredDonation(transactions: Transaction[]): number`, will be responsible for this.
- This function will iterate through the _entire_ `transactions` array and calculate the final balance based on the `type` and `amount` (and `isChomesh` where applicable) of each transaction.
  - `income`: Add `amount * 0.1` (or `amount * 0.2` if `isChomesh`) to the balance.
  - `donation`: Subtract `amount` from the balance.
  - `expense`: No change to the balance.
  - `exempt-income`: No change to the balance.
  - `recognized-expense`: Subtract `amount * 0.1` from the balance.
- The final balance **can be negative**. A negative balance indicates a surplus, meaning the user has donated more than the calculated required amount up to that point.
- This function is the **single source of truth** for the required tithe balance.

## 4. Frontend Calculation and Performance

- To display the current required tithe balance in the UI, use memoization techniques:
  - **Zustand Selectors**: Define a memoized selector within or alongside the `useDonationStore` that takes `state.transactions` and returns the result of `calculateTotalRequiredDonation(state.transactions)`.
  - **`React.useMemo`**: Alternatively, within components that need the balance, use `React.useMemo(() => calculateTotalRequiredDonation(transactionsFromStore), [transactionsFromStore])`.
- Memoization ensures the full calculation runs _only_ when the `transactions` array actually changes, providing good performance even with many transactions.

## 5. Database Schema (SQLite & Supabase)

- Both databases will use a single table named `transactions` (or similar).
- The table schema will mirror the `Transaction` interface, including columns for `id`, `user_id`, `date`, `amount`, `currency`, `description`, `type`, and any type-specific fields.
- The database **stores only the raw transaction data**. The calculated balance is _not_ stored in the database.

**`transactions` Table Schema Example (Original Plan - `snake_case`):**

| Column Name              | Data Type (SQL)                     | Description                                                    | Nullable | Notes                                                             |
| ------------------------ | ----------------------------------- | -------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| `id`                     | `TEXT` / `VARCHAR` / `UUID`         | Primary Key, Unique identifier for the transaction             | No       | Use `nanoid` or DB's UUID generation                              |
| `user_id`                | `TEXT` / `VARCHAR` / `UUID`         | Foreign Key to users table (Supabase), Identifier of the owner | Yes      | **Crucial for RLS in Supabase**. Can be NULL in SQLite (Desktop). |
| `date`                   | `TEXT` / `DATE`                     | Date of the transaction (YYYY-MM-DD)                           | No       |                                                                   |
| `amount`                 | `REAL` / `NUMERIC` / `DECIMAL`      | Transaction amount (positive value)                            | No       | Choose precision as needed                                        |
| `currency`               | `TEXT` / `VARCHAR(3)`               | Currency code (e.g., 'ILS')                                    | No       |                                                                   |
| `description`            | `TEXT`                              | User-provided description                                      | Yes      |                                                                   |
| `type`                   | `TEXT` / `VARCHAR`                  | Transaction type ('income', 'donation', 'expense', etc.)       | No       | Consider CHECK constraint for valid types                         |
| `category`               | `TEXT` / `VARCHAR`                  | Optional category (e.g., 'Housing', 'Food')                    | Yes      | Primarily for expense types                                       |
| `is_chomesh`             | `BOOLEAN` / `INTEGER(1)`            | Indicates if 20% tithe applies (for 'income' type)             | Yes      | Only relevant for `type = 'income'`, NULL otherwise               |
| `recipient`              | `TEXT`                              | Recipient/purpose of donation (for 'donation' type)            | Yes      | Only relevant for `type = 'donation'`, NULL otherwise             |
| `is_recurring`           | `BOOLEAN` / `INTEGER(1)`            | Indicates if transaction is recurring (standing order)         | Yes      | Typically relevant for `type = 'income'` or `'donation'`          |
| `recurring_day_of_month` | `INTEGER`                           | Day of month (1-31) for recurring transactions                 | Yes      | Only relevant if `is_recurring = true`, NULL otherwise            |
| `created_at`             | `TEXT` / `TIMESTAMP WITH TIME ZONE` | Timestamp of creation                                          | Yes      | `DEFAULT CURRENT_TIMESTAMP` recommended                           |
| `updated_at`             | `TEXT` / `TIMESTAMP WITH TIME ZONE` | Timestamp of last update                                       | Yes      | Update using triggers or application logic                        |

**Current Supabase Implementation Note :**

- **Naming Convention:** Due to frontend integration challenges, the column names in the Supabase `transactions` table were updated to use **`camelCase`** (e.g., `"isChomesh"`, `"isRecurring"`, `"createdAt"`). The `id` and `user_id` columns remain `snake_case`.
- **Primary Key (`id`):** The `id` column in Supabase is of type `uuid` and its value is automatically generated by the database (`DEFAULT gen_random_uuid()`). The frontend **does not** send an `id` when creating new transactions.
- **TypeScript Type (`Transaction`):** The corresponding TypeScript type currently appears to use a mix of `camelCase` (e.g., `isChomesh`) and `snake_case` (e.g., `is_recurring`). The `dataService.ts` layer handles mapping between the TS type and the DB columns during insert/update operations.
- **Recommendation:** For improved consistency and maintainability, consider aligning both the Supabase schema and the TypeScript type to use `snake_case` universally in the future.

## 6. Data Flow Summary

- **Load**: Triggered by authentication events (`AuthContext`), fetch all relevant `transactions` from DB (SQLite via Tauri for Desktop, Supabase for Web using `dataService`). Populate `transactions` array in Zustand store, replacing previous content.
- **Display**: Read `transactions` from Zustand store. Calculate balance for display using the memoized selector/`useMemo` calling `calculateTotalRequiredDonation`.
- **Save**: Persist new/updated/deleted `transaction` to DB (via `dataService`). Upon successful DB operation, update the `transactions` array in the Zustand store.
- **Clear**: Triggered by authentication events (sign-out) or explicit user action (`clearAllData`), clear the `transactions` array in the Zustand store (and potentially clear data in the DB via `dataService`).

## 7. Implementation Plan

- Implement and test this new model first for the **Desktop version (SQLite)**.
- Once validated, apply the same model to the **Web version (Supabase)**, ensuring appropriate RLS policies are set on the `transactions` table.

## 8. Implementation Status (as of [Current Date/Refactoring Completion])

- The unified `Transaction` model and dynamic balance calculation (`calculateTotalRequiredDonation`) are fully implemented and utilized for the **Desktop version (SQLite)**.
- This includes:
  - Updated Rust backend commands (`add_transaction`, `get_transactions`).
  - Updated Zustand store (`transactions` array, `selectCalculatedBalance` selector).
  - Updated `dataService` functions.
- Key frontend components have been refactored to use the new model:
  - `StatsCards`: Displays income, expense, donation totals and required balance based on `transactions`. UI colors aligned.
  - `MonthlyChart`: Displays monthly income, expense, and donation totals based on `transactions`. UI colors aligned.
  - `TransactionForm`: Unified form for adding all transaction types, using conditional checkboxes for subtypes (`exempt`/`recognized`), and improved UI (type buttons, layout, success indicator).
  - `AllTransactionsDataTable`: Displays all transactions with sorting, filtering, pagination (10 per page), translated & colored type badges, and an icon for Chomesh.
- Export functionality (`Excel`, `PDF`) has been updated to work with the `transactions` array and integrated into `AllTransactionsDataTable`.
- The next steps involve migrating the Web version (Supabase) and then removing the deprecated code (old models, state, functions, DB tables).

## 9. Modifying the Transaction Model (Adding a New Field)

To add a new field (e.g., `notes`) to the `Transaction` model, you typically need to modify the following areas:

1.  **TypeScript Definition:**

    - Update the `Transaction` interface/type in `src/types/transaction.ts` (or relevant types file).
    - Example: Add `notes?: string;`

2.  **Database Schema:**

    - **Desktop (SQLite):** Add the corresponding column to the `transactions` table. This might involve modifying initialization code or migration logic within `src-tauri/src/main.rs` or related Rust modules handling DB setup.
    - Example SQL: `ALTER TABLE transactions ADD COLUMN notes TEXT NULL;`
    - **Web (Supabase):** Add the corresponding column via the Supabase Dashboard (SQL Editor or Migrations UI) or using Supabase CLI migrations. Ensure appropriate default values or nullability.
    - Example SQL: `ALTER TABLE transactions ADD COLUMN notes TEXT NULL;`
    - **RLS (Supabase):** Review and update Row Level Security policies if the new field impacts access control.

3.  **Backend Logic (Desktop - Rust):**

    - Modify Rust functions (`#[tauri::command]`) in `src-tauri/src/main.rs` (or related modules) handling CRUD operations (`add_transaction`, `get_transactions`, etc.) to include the new field in SQL queries (`INSERT`, `UPDATE`, `SELECT`) and in data passed to/from the frontend via `invoke`.

4.  **Frontend Logic (React/TypeScript):**
    - **Data Fetching/Mutation:** Update functions calling the backend (`invoke` for Rust, `@supabase/supabase-js` methods for Web) to send and receive the new field. Check service files like `src/lib/dataService.ts`.
    - **Validation (Zod):** Add the field to the Zod schema used for validation (likely near `TransactionForm`). Example: `notes: z.string().optional()`
    - **UI Components:**
      - Add input fields to forms (`src/components/TransactionForm.tsx` or similar) using `react-hook-form` and `shadcn/ui`.
      - Update display components like tables (`src/components/AllTransactionsDataTable.tsx`) or detail views to show the new field if needed.
    - **State Management (Zustand):** Usually requires no change if the store holds `Transaction[]`, as the type definition update is sufficient.

**Remember to test thoroughly across both Desktop and Web versions after adding a field.**
