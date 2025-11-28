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
  - `created_at`: `string` (ISO 8601 timestamp, optional)
  - `updated_at`: `string` (ISO 8601 timestamp, optional)
- **Transaction Type (`TransactionType`)**: Enum/string literal union defining the nature of the transaction and its impact on tithe calculation.
  - `'income'`: Regular income subject to tithe (10% or 20%). Requires `is_chomesh: boolean`. Can be recurring.
  - `'donation'`: Includes donations, tzedakah, and mitzvah expenses permissible to be paid from tithe funds (e.g., tuition fees for religious studies). Reduces required tithe by 100% of the amount. Requires `recipient: string` (or similar field indicating purpose). Can be recurring.
  - `'expense'`: Regular expense (e.g., groceries, utilities). Does not affect tithe calculation.
  - `'exempt-income'`: Income inherently exempt from tithe (e.g., certain gifts, specific stipends, offset rental income). Does not affect tithe calculation. **Note:** Reimbursements for expenses are _not_ exempt income; they should reduce the amount of the original expense recorded (or the expense shouldn't be recorded if fully reimbursed).
  - `'recognized-expense'`: Business or work-related expenses that reduce the income base subject to tithe (e.g., travel, babysitting for work, business investments/ads). Reduces required tithe by 10% of the expense amount.
  - `'non_tithe_donation'`: Represents a donation made from personal, non-tithe funds. It does not reduce the required tithe amount. However, it _is_ included in the total sum of donations for reporting purposes and can be displayed separately.
- **Specific Fields**: Fields relevant only to certain types (e.g., `is_chomesh`, `recipient`) are defined in the interface but only populated when relevant.
  **UI Handling**: In the `TransactionForm`, subtypes like `exempt-income` and `recognized-expense` are handled via conditional checkboxes presented under the main `income` or `expense` type selections, simplifying the initial choice for the user while allowing for the necessary detail.

## 2. State Management (Zustand)

### 2.1. General Transaction Store (`useDonationStore`)

- This store (`src/lib/store.ts`) has historically been the primary state for financial data, holding a single array: `transactions: Transaction[]`.
- It's used for global calculations like the overall tithe balance and potentially for components that need access to _all_ transactions without the specific filtering/pagination of the main transactions table.
- The calculated `requiredDonation` (overall tithe balance) **will not** be stored directly in this Zustand state; it's calculated dynamically.

### 2.2. Transactions Table Store (`useTableTransactionsStore`)

- As detailed in the "Transactions Table Technical Overview" (`transactions-table-technical-overview.md`), a dedicated store (`src/lib/tableTransactions.store.ts`) manages the state and business logic specifically for the main interactive transactions table.
- **Key Responsibilities & State:**
  - `transactions: Transaction[]`: Holds the _currently displayed_ subset of transactions in the table (after filtering, sorting, and pagination).
  - `loading: boolean`: Indicates if data is being fetched for the table.
  - `error: string | null`: Stores any error messages related to table data operations.
  - `pagination`: Manages pagination state (`page`, `limit`, `hasMore`, `totalCount`).
  - `filters`: Stores active filter criteria (`search`, `dateRange`, `types`).
  - `sorting`: Stores current sorting configuration (`field`, `direction`).
  - `exportLoading: boolean`, `exportError: string | null`: Manages state for data export operations.
- **Data Fetching:** This store is responsible for fetching its own data through `src/lib/tableTransactions/tableTransactionService.ts` (`TableTransactionsService.fetchTransactions`), which handles platform-specific calls to Supabase RPCs or Tauri commands designed for paginated and filtered data.
- **Relationship with `useDonationStore`:** These two stores operate largely independently. `useDonationStore` might hold a broader set of all transactions for general calculations, while `useTableTransactionsStore` manages the specific view and interaction logic for the main transactions table. There isn't typically a direct data flow from one to the other for the `transactions` array itself; each fetches data as needed for its purpose.

## 3. Balance Calculation Logic (Overall Tithe Balance)

- All logic for calculating the _overall required tithe balance_ (not specific to a filtered table view) will reside in a dedicated utility file (e.g., `src/lib/tithe-calculator.ts`).
- A central function, e.g., `calculateTotalRequiredDonation(transactions: Transaction[]): number`, will be responsible for this. This function would typically operate on the `transactions` array from `useDonationStore` or a comprehensive list fetched for this purpose.
- This function will iterate through the _entire_ `transactions` array and calculate the final balance based on the `type` and `amount` (and `is_chomesh` where applicable) of each transaction.
  - `income`: Add `amount * 0.1` (or `amount * 0.2` if `is_chomesh`) to the balance.
  - `donation`: Subtract `amount` from the balance.
  - `expense`: No change to the balance.
  - `exempt-income`: No change to the balance.
  - `recognized-expense`: Subtract `amount * 0.1` from the balance.
  - `non_tithe_donation`: No change to the balance.
- The final balance **can be negative**. A negative balance indicates a surplus, meaning the user has donated more than the calculated required amount up to that point.
- This function is the **single source of truth** for the _overall_ required tithe balance.

## 4. Frontend Calculation and Performance

- To display the current _overall required tithe balance_ in the UI, use memoization techniques:
  - **Zustand Selectors**: Define a memoized selector within or alongside the `useDonationStore` that takes `state.transactions` and returns the result of `calculateTotalRequiredDonation(state.transactions)`.
  - **`React.useMemo`**: Alternatively, within components that need the balance, use `React.useMemo(() => calculateTotalRequiredDonation(transactionsFromStore), [transactionsFromStore])`.
- Memoization ensures the full calculation runs _only_ when the `transactions` array (from `useDonationStore`) actually changes.
- For the main transactions table, performance is managed by server-side pagination/filtering and the `useTableTransactionsStore`.

## 5. Database Schema (SQLite & Supabase)

- Both databases will use a single table named `transactions` (or similar).
- The table schema will mirror the `Transaction` interface, including columns for `id`, `user_id`, `date`, `amount`, `currency`, `description`, `type`, and any type-specific fields.
- The database **stores only the raw transaction data**. Calculated balances or aggregated views for specific UI components (like the main table) are generated by queries/RPCs or client-side processing of fetched data.

**`transactions` Table Schema Example (Consistent `snake_case`):**

| Column Name   | Data Type (SQL)                     | Description                                                    | Nullable | Notes                                                                         |
| ------------- | ----------------------------------- | -------------------------------------------------------------- | -------- | ----------------------------------------------------------------------------- |
| `id`          | `TEXT` / `VARCHAR` / `UUID`         | Primary Key, Unique identifier for the transaction             | No       | Use `nanoid` or DB's UUID generation                                          |
| `user_id`     | `TEXT` / `VARCHAR` / `UUID`         | Foreign Key to users table (Supabase), Identifier of the owner | Yes      | **Crucial for RLS in Supabase**. Can be NULL in SQLite (Desktop).             |
| `date`        | `TEXT` / `DATE`                     | Date of the transaction (YYYY-MM-DD)                           | No       |                                                                               |
| `amount`      | `REAL` / `NUMERIC` / `DECIMAL`      | Transaction amount (positive value)                            | No       | Choose precision as needed                                                    |
| `currency`    | `TEXT` / `VARCHAR(3)`               | Currency code (e.g., 'ILS')                                    | No       |                                                                               |
| `description` | `TEXT`                              | User-provided description                                      | Yes      |                                                                               |
| `type`        | `TEXT` / `VARCHAR`                  | Transaction type ('income', 'donation', 'expense', etc.)       | No       | Consider CHECK constraint for valid types (must include `non_tithe_donation`) |
| `category`    | `TEXT` / `VARCHAR`                  | Optional category (e.g., 'Housing', 'Food')                    | Yes      | Primarily for expense types                                                   |
| `is_chomesh`  | `BOOLEAN` / `INTEGER(1)`            | Indicates if 20% tithe applies (for 'income' type)             | Yes      | Only relevant for `type = 'income'`, NULL otherwise                           |
| `recipient`   | `TEXT`                              | Recipient/purpose of donation (for 'donation' type)            | Yes      | Only relevant for `type = 'donation'`, NULL otherwise                         |
| `created_at`  | `TEXT` / `TIMESTAMP WITH TIME ZONE` | Timestamp of creation                                          | Yes      | `DEFAULT CURRENT_TIMESTAMP` recommended                                       |
| `updated_at`  | `TEXT` / `TIMESTAMP WITH TIME ZONE` | Timestamp of last update                                       | Yes      | Update using triggers or application logic                                    |

**Current Supabase Implementation Note :**

- **Naming Convention:** The column names in the Supabase `transactions` table and the corresponding TypeScript `Transaction` type now consistently use **`snake_case`** (e.g., `is_chomesh`, `created_at`, `updated_at`). This was a deliberate change to improve consistency and maintainability across the codebase.
- **Primary Key (`id`):** The `id` column in Supabase is of type `uuid` and its value is automatically generated by the database (`DEFAULT gen_random_uuid()`). The frontend **does not** send an `id` when creating new transactions.
- **TypeScript Type (`Transaction`):** The `Transaction` type in TypeScript (`src/types/transaction.ts`) now also uses `snake_case` for all its fields, matching the database schema. Service layers like the `data-layer` module ensure data is handled correctly with this consistent naming.

## 6. Data Flow Summary

### 6.1. General Data Flow (e.g., for Overall Tithe Balance, non-table specific data)

- **Load**: Triggered by authentication events (`AuthContext`) and data freshness checks. Fetches all relevant `transactions` from DB (SQLite via Tauri for Desktop, Supabase for Web using the `data-layer` module or similar general service) only if explicitly forced or if existing data in `useDonationStore` is stale. Populates `transactions` array in `useDonationStore`.
- **Display**: Read `transactions` from `useDonationStore`. Calculate overall tithe balance for display using the memoized selector/`useMemo` calling `calculateTotalRequiredDonation`.
- **Save (General/Legacy)**: If using a general service from the `data-layer` module to add transactions outside the table context, it would persist to DB and then potentially update `useDonationStore`.

### 6.2. Data Flow for the Interactive Transactions Table

- **Load/Fetch**: The `TransactionsTableDisplay` component, upon mount or when filters/sorting/pagination change (and platform is identified), triggers the `fetchTransactions` action in `useTableTransactionsStore`.
  - This action sets `loading` to true.
  - It then calls the appropriate method in `src/lib/tableTransactions/tableTransactionService.ts` (`TableTransactionsService.fetchTransactions`), passing the current filters, pagination, sorting, and platform.
  - `tableTransactionService.ts` invokes the relevant Supabase RPC (e.g., `get_paginated_transactions`) or Tauri command (e.g., `get_filtered_transactions_handler`).
  - The response (a page of transactions and total count) is returned to the store.
  - The store updates its `transactions` array, `pagination` details, and sets `loading` to false. `error` is updated if necessary.
- **Display**: `TransactionsTableDisplay` and its sub-components (`TransactionRow`, `TransactionsTableFooter`) subscribe to `useTableTransactionsStore` and re-render when its state (e.g., `transactions`, `loading`, `pagination.hasMore`) changes.
- **Update/Delete**:
  - User interaction in `TransactionRow` (e.g., clicking "Edit" or "Delete") triggers handlers in `TransactionsTableDisplay`.
  - For "Edit", `TransactionEditModal` is opened. Upon submission, its `onSubmit` function calls the `updateTransaction` action in `useTableTransactionsStore`.
  - For "Delete", after confirmation, `handleDeleteConfirm` calls the `deleteTransaction` action in `useTableTransactionsStore`.
  - These store actions then call the respective methods in `src/lib/tableTransactions/tableTransactionService.ts` (`updateTransaction`, `deleteTransaction`), which interact with the backend.
  - Upon successful backend operation, the store updates its local `transactions` array (e.g., modifies the item or removes it) to reflect the change immediately in the UI.
- **Export**:
  - User selects an export format in `ExportButton.tsx`.
  - The `exportTransactions` action in `useTableTransactionsStore` is called.
  - This action sets `exportLoading` to true.
  - It calls `src/lib/tableTransactions/tableTransactionService.ts` (`TableTransactionsService.exportTransactions`), which fetches _all_ relevant data (respecting filters/sort, but not paginated) from the backend.
  - Once data is received, client-side libraries (`exceljs`, `jspdf`) are used to generate and download the file.
  - `exportLoading` and `exportError` are updated accordingly.

## 7. Implementation Plan

- Implement and test this new model first for the **Desktop version (SQLite)**.
- Once validated, apply the same model to the **Web version (Supabase)**, ensuring appropriate RLS policies are set on the `transactions` table.

## 8. Implementation Status (Reflecting Transactions Table)

- The unified `Transaction` model is the base for all financial data.
- The dynamic calculation for the _overall tithe balance_ (`calculateTotalRequiredDonation`) is defined and can be used with data from `useDonationStore`.
- **A new, comprehensive interactive transactions table has been implemented as per `transactions-table-technical-overview.md`. This includes:**
  - **Dedicated Store:** `useTableTransactionsStore` (`src/lib/tableTransactions.store.ts`) for managing the table's specific state (filtered/sorted/paginated data, loading states, filters, etc.).
  - **Dedicated Service:** `src/lib/tableTransactions/tableTransactionService.ts` (`TableTransactionsService`) for handling data operations (fetch, update, delete, export) for the table, interacting with platform-specific backends (Supabase RPCs for web, Tauri commands for desktop).
  - **Core Table Components:**
    - `src/pages/TransactionsTable.tsx`: Main page hosting the table.
    - `src/components/TransactionsTable/TransactionsTableDisplay.tsx`: Core logic for data fetching, display, edit/delete initiation.
    - `src/components/TransactionsTable/TransactionsFilters.tsx`: UI and logic for filtering.
    - `src/components/TransactionsTable/TransactionsTableHeader.tsx`: Header rendering and sort logic.
    - `src/components/TransactionsTable/TransactionRow.tsx`: Rendering a single transaction row and its actions.
    - `src/components/TransactionsTable/TransactionEditModal.tsx`: Modal for editing transactions.
    - `src/components/TransactionsTable/ExportButton.tsx`: UI and logic for data export (CSV, Excel, PDF).
    - `src/components/TransactionsTable/TransactionsTableFooter.tsx`: "Load More" functionality and data count display.
- This new table system fetches and manages its data independently of the older, simpler `AllTransactionsDataTable.tsx` or the general `useDonationStore`'s `transactions` array when it comes to displaying the main list of transactions.

## 10. Centralized Transaction Type Definitions (Rust)

- **File:** `src-tauri/src/transaction_types.rs`
- **Purpose:** Centralizes the definition of transaction type groupings for use in Rust SQL queries, ensuring consistency across all backend commands.
- **Contents:**
  - **Constants:**
    - `INCOME_TYPES: &[&str]` - Array of income-related types: `["income"]`
    - `DONATION_TYPES: &[&str]` - Array of donation-related types: `["donation", "non_tithe_donation"]`
    - `EXPENSE_TYPES: &[&str]` - Array of expense-related types: `["expense", "recognized-expense"]`
  - **Helper Functions:**
    - `income_types_condition()` - Returns SQL condition string for income types
    - `donation_types_condition()` - Returns SQL condition string for donation types
    - `expense_types_condition()` - Returns SQL condition string for expense types
    - `income_types_case_condition()` - Returns SQL CASE WHEN condition for income types
    - `donation_types_case_condition()` - Returns SQL CASE WHEN condition for donation types
    - `expense_types_case_condition()` - Returns SQL CASE WHEN condition for expense types
- **Usage:** All Rust commands (`chart_commands.rs`, `expense_commands.rs`, `income_commands.rs`, `donation_commands.rs`) should import and use these definitions instead of hardcoding transaction type conditions in SQL queries.
- **Benefits:**
  - **Consistency:** Ensures all queries use the same type definitions
  - **Maintainability:** Changes to type groupings only need to be made in one place
  - **Error Prevention:** Reduces risk of missing transaction types in calculations (e.g., `recognized-expense` was previously missing from chart calculations)
- **Note:** This centralization is currently only for Rust code. TypeScript definitions remain in `src/types/transaction.ts`, and Supabase SQL functions have inline documentation referencing these types. A fully unified solution across all three (Rust, Supabase, TypeScript) would require build scripts or code generation, which is beyond the current project scope.

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
    - **Data Fetching/Mutation:** Update functions calling the backend (`invoke` for Rust, `@supabase/supabase-js` methods for Web) to send and receive the new field. Check service files in `src/lib/data-layer/`.
    - **Validation (Zod):** Add the field to the Zod schema used for validation (likely near `TransactionForm`). Example: `notes: z.string().optional()`
    - **UI Components:**
      - Add input fields to forms (`src/components/TransactionForm.tsx` or similar) using `react-hook-form` and `shadcn/ui`.
      - Update display components like tables (`src/components/AllTransactionsDataTable.tsx`) or detail views to show the new field if needed.
    - **State Management (Zustand):** Usually requires no change if the store holds `Transaction[]`, as the type definition update is sufficient.

**Remember to test thoroughly across both Desktop and Web versions after adding a field.**
