# LLM Guide: Desktop Data Saving and Retrieval Process (Tauri + SQLite with Unified Transaction Model)

This document explains how data (unified `Transaction` objects) is saved locally and retrieved for display when the application runs in a desktop environment using Tauri and SQLite.

**Core Idea:** Implement a platform-specific data persistence layer. On desktop, all financial events are saved as `Transaction` records to a local SQLite database via Tauri's Rust backend. The Zustand store holds the `transactions` array as a cache synchronized with the DB. The required tithe balance is calculated dynamically from this array.

## 1. Platform Detection

- **Context:** `src/contexts/PlatformContext.tsx` provides a React context (`PlatformContext`).
- **Provider:** `PlatformProvider` detects the environment (checks for `window.__TAURI__`) on mount and sets the platform state (`'web'` or `'desktop'`).
- **Hook:** `usePlatform` hook allows components to access the current platform state.
- **Initialization:** `src/App.tsx` uses `useEffect` to call `setDataServicePlatform` once the platform state is determined (not `'loading'`).

## 2. Data Service Abstraction (`dataService.ts` and `transactionService.ts`)

- **`src/lib/dataService.ts`**: This service handles basic, general data operations.

  - **State:** It holds the `currentPlatform` variable (set by `setDataServicePlatform`).
  - **Add Operation (General):**
    - `addTransaction(transaction: Transaction)`: Checks `currentPlatform`.
    - If `'desktop'`, it calls Tauri `invoke('add_transaction_handler', { transaction })` to save to the `transactions` table in SQLite.
    - **Crucially, upon successful invocation, it _also_ calls `useDonationStore.getState().addTransaction(transaction)` to update the in-memory `transactions` array in the general Zustand store (`useDonationStore`).**
    - If `'web'`, it should eventually call the Supabase API (currently placeholder for general add, table uses specific RPCs).
  - **Load Operation (General):**
    - `loadTransactions()`: Checks `currentPlatform`.
    - If `'desktop'`, it calls Tauri `invoke('get_transactions_handler')` to retrieve all `Transaction` records from the SQLite `transactions` table. The returned array is used to populate the `useDonationStore`.
    - If `'web'`, it should eventually fetch from Supabase (currently returns empty array for general load, table uses specific RPCs).

- **`src/lib/transactionService.ts` (`TableTransactionsService` class):** This service is specifically designed for the complex interactions of the main interactive transactions table.
  - It provides methods like `fetchTransactions`, `updateTransaction`, `deleteTransaction`, and `exportTransactions`.
  - These methods use `platform` context to call appropriate backend functions:
    - **Desktop (Tauri):** Invokes specific Tauri commands like `get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`, and `export_transactions_handler`.
    - **Web (Supabase):** Invokes specific Supabase RPC functions like `get_paginated_transactions`, `update_user_transaction`, `delete_user_transaction`, and `export_user_transactions`.
  - This service interacts with `useTableTransactionsStore` to update the table's state upon successful operations.

## 3. Frontend to Backend Communication (Tauri Invoke)

- **Mechanism:** When `currentPlatform` is `'desktop'`:
  - `dataService.ts` (for general save/load) uses `invoke` with commands like `add_transaction_handler` and `get_transactions_handler`.
  - `transactionService.ts` (for table-specific operations) uses `invoke` with commands like `get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`.
- **Usage (Save - General):** `await invoke('add_transaction_handler', { transaction: transactionData })`
- **Usage (Load - General):** `await invoke<Transaction[]>('get_transactions_handler')`
- **Usage (Load - Table Specific):** `await invoke<PaginatedTransactionsResponse>('get_filtered_transactions_handler', { args: { filters, pagination, sorting } })`
- **Error Handling:** `try...catch` blocks should wrap `invoke` calls to handle potential errors during DB operations.

## 4. Backend (Rust) Implementation (`src-tauri/src/main.rs`)

- **File:** `src-tauri/src/main.rs` contains the Rust backend logic.
- **Data Structure:** Defines a `Transaction` struct mirroring the TypeScript interface (which uses `snake_case` for its fields). It uses `#[derive(Serialize, Deserialize)]`. The `#[serde(rename_all = "camelCase")]` attribute has been removed to ensure consistency with `snake_case` naming used across the application (TypeScript, Database, Rust).
- **Save Command (General):** `#[tauri::command] add_transaction_handler(db: State<'_, DbState>, transaction: Transaction)` receives the transaction object, performs an `INSERT` into the `transactions` SQLite table. Handles optional fields and boolean-to-integer conversion (e.g., for `is_chomesh`).
- **Load Command (General):** `#[tauri::command] get_transactions_handler(db: State<'_, DbState>)` performs `SELECT * FROM transactions`, maps the results from the database rows back into a `Vec<Transaction>`, handling potential NULLs and integer-to-boolean conversion, and returns the vector.
- **Table-Specific Commands:**
  - `#[tauri::command] get_filtered_transactions_handler(db_state: State<'_, DbState>, args: GetFilteredTransactionsArgs)`: Fetches paginated and filtered transactions for the table.
  - `#[tauri::command] update_transaction_handler(db_state: State<'_, DbState>, transaction_id: String, updates: UpdateTransactionPayload)`: Updates a specific transaction.
  - `#[tauri::command] delete_transaction_handler(db_state: State<'_, DbState>, transaction_id: String)`: Deletes a specific transaction.
  - `#[tauri::command] export_transactions_handler(db_state: State<'_, DbState>, args: ExportTransactionsArgs)`: Fetches all transactions matching filters/sorting for export.
- **DB Init Command:** `#[tauri::command] init_db(db: State<'_, DbState>)` ensures the `transactions` table exists (`CREATE TABLE IF NOT EXISTS transactions (...)`) with the correct schema. (It might still create old tables temporarily).
- **Clear Command:** `#[tauri::command] clear_all_data(db: State<'_, DbState>)` now also executes `DELETE FROM transactions`.
- **Database Connection:** Managed via `DbState(Mutex<Connection>)`.
- **Handler:** All relevant commands (`init_db`, `add_transaction_handler`, `get_transactions_handler`, `clear_all_data`, `get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`, etc.) are registered in the `.invoke_handler(...)`.

## 5. Zustand Store (`store.ts` and `tableTransactions.store.ts`)

- **`useDonationStore` (`src/lib/store.ts`):**

  - **State:** Holds `transactions: Transaction[] = []` for general purposes (e.g., overall tithe calculation). The previous `incomes`, `donations`, and `requiredDonation` fields are deprecated and will be removed.
  - **Actions:**
    - `setTransactions(transactions: Transaction[])`: Replaces the entire array (used during initial general load).
    - `addTransaction(transaction: Transaction)`: Adds a single transaction to the array (called by `dataService` after successful general DB save).
  - **Balance Calculation:** The overall required tithe balance is **not stored** in the state. It's calculated dynamically using a selector `selectCalculatedBalance(state: DonationState)` which uses `calculateTotalRequiredDonation(state.transactions)`.

- **`useTableTransactionsStore` (`src/lib/tableTransactions.store.ts`):**
  - **State:** Manages all state related to the interactive transactions table: `transactions` (current page/view), `loading`, `error`, `pagination`, `filters`, `sorting`, `exportLoading`, `exportError`.
  - **Actions:** Provides actions to `fetchTransactions`, `updateTransaction`, `deleteTransaction`, `exportTransactions`, `setFilters`, `setSorting`, `setLoadMorePagination`, etc. These actions typically use `transactionService.ts` for backend communication.

## 6. Database Initialization and Initial Load

- **DB Init Command:** `init_db` ensures the `transactions` table exists.
- **Trigger:** Invoked once from `src/App.tsx` when `platform === 'desktop'`.
- **Initial Data Load (General - `useDonationStore`):** _Immediately after_ `init_db` succeeds in `App.tsx`:
  1. `dataService.loadTransactions()` is called. This invokes `get_transactions_handler` in Rust.
  2. The returned array (`Vec<Transaction>`) is used to **overwrite** the `transactions` state in `useDonationStore` using `useDonationStore.setState({ transactions: ... })`.
  3. This populates `useDonationStore` (used for overall calculations) with the current state of the `transactions` table in the SQLite DB.
- **Initial Data Load (Transactions Table - `useTableTransactionsStore`):**
  - The `TransactionsTableDisplay.tsx` component, upon mount (and after platform identification), triggers `fetchTransactions(true, 'desktop')` from `useTableTransactionsStore`. This fetches the first page of data for the table.

## 7. Data Flow Summary (Add Transaction on Desktop - Table Context)

1. User interacts with the `TransactionEditModal` (for new or existing transaction, initiated from `TransactionsTableDisplay`).
2. `onSubmit` in `TransactionEditModal` calls `updateTransaction` (or a new `addTransactionToTable` if distinct) action in `useTableTransactionsStore`.
3. The store action calls the relevant method in `transactionService.ts` (e.g., `TableTransactionsService.updateTransaction` or a new `addTransaction`).
4. `transactionService.ts` sees `'desktop'`, calls `invoke('update_transaction_handler', { ... })` or `invoke('add_transaction_handler', { ... })` (if `add_transaction_handler` is reused, or a new specific one for table).
5. Rust command saves/updates the `Transaction` object in the SQLite `transactions` table.
6. `invoke` returns successfully.
7. `transactionService.ts` returns success to the store action.
8. The store action updates its local `transactions` array (e.g., adds/modifies the item) and potentially re-fetches or updates pagination if needed.
9. UI components listening to `useTableTransactionsStore` (e.g., `TransactionsTableDisplay`, `TransactionRow`) re-render.

## 8. Data Flow Summary (Displaying Data/Balance on Desktop)

1. **App Startup (General Data):** `App.tsx` detects `'desktop'`, calls `init_db`, then `dataService.loadTransactions()`, populating the `transactions` array in `useDonationStore`.
2. **App Startup (Table Data):** `TransactionsTable.tsx` (via `TransactionsTableDisplay.tsx`) triggers `fetchTransactions` from `useTableTransactionsStore`, loading the initial view for the table.
3. **UI Rendering (Table):** `TransactionsTableDisplay` and `TransactionRow` use `useTableTransactionsStore` to get the data array for the current view and render it.
4. **UI Rendering (Dashboard - Overall Balance):**
   - `StatsCards` uses the selector `useDonationStore(selectCalculatedBalance)` to get the dynamically calculated overall tithe balance from `useDonationStore`.
5. **Updates (Table Context):** When new data is added/edited/deleted via the table UI, `useTableTransactionsStore` is updated after the DB save, triggering UI re-renders for table components.

## 9. Key Files (Post-Cleanup & Table Integration)

- `src/types/transaction.ts` (Defines `Transaction` interface)
- `src/contexts/PlatformContext.tsx` (Platform detection)
- `src/App.tsx` (Platform init, DB init via invoke, Initial general `transactions` load to `useDonationStore`)
- `src/routes.ts` (Defines application routes and navigation structure)
- `src/lib/dataService.ts` (Abstraction layer for general CRUD: `addTransaction`, `loadTransactions`, `clearAllData`)
- `src/lib/transactionService.ts` (Service for interactive table: `fetchTransactions`, `updateTransaction`, `deleteTransaction`, `exportTransactions`)
- `src/lib/store.ts` (Zustand store - `useDonationStore`: general `transactions` array, `settings`, `selectCalculatedBalance` selector)
- `src/lib/tableTransactions.store.ts` (Zustand store - `useTableTransactionsStore`: table-specific state and actions)
- `src/lib/tithe-calculator.ts` (Contains `calculateTotalRequiredDonation` logic for overall balance)
- **UI Components:**
  - `src/components/forms/TransactionForm.tsx` (Unified form, potentially used by `TransactionEditModal`)
  - `src/pages/TransactionsTable.tsx` (Hosts the new interactive table)
  - `src/components/TransactionsTable/TransactionsTableDisplay.tsx` (Core display logic for the table)
  - `src/components/TransactionsTable/TransactionsFilters.tsx` (Filtering UI and logic)
  - `src/components/TransactionsTable/TransactionsTableHeader.tsx` (Table header and sorting)
  - `src/components/TransactionsTable/TransactionRow.tsx` (Single row rendering and actions)
  - `src/components/TransactionsTable/TransactionEditModal.tsx` (Modal for adding/editing transactions in table context)
  - `src/components/TransactionsTable/ExportButton.tsx` (Export functionality for the table)
  - `src/components/TransactionsTable/TransactionsTableFooter.tsx` (Pagination and load more)
  - `src/components/dashboard/StatsCards.tsx` (Displays totals & overall balance from `useDonationStore`)
  - `src/components/dashboard/MonthlyChart.tsx` (Displays monthly aggregates from `useDonationStore` or a similar general source)
  - `src/components/layout/Sidebar.tsx` (Navigation menu)
- **Pages:**
  - `src/pages/HomePage.tsx` (Main dashboard view, includes `StatsCards`, `MonthlyChart`, and likely the new `TransactionsTable` page/component)
  - `src/pages/AddTransactionPage.tsx` (Potentially for adding transactions outside the main table, or could be deprecated if all additions go through `TransactionEditModal`)
  - `src/pages/AnalyticsPage.tsx` (Placeholder for future data analysis)
  - `src/pages/HalachaPage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/AboutPage.tsx`, `src/pages/ProfilePage.tsx` (Other application pages)
- `src-tauri/src/main.rs` (Rust: `Transaction` struct, commands for init, general add/get, table-specific handlers for filtered get, update, delete, export; DB logic)
- `Ten10.db` (The SQLite database file containing **only** the `transactions` table)

## 10. Post-Refactoring Cleanup (Completed)

This section documents the deprecated components and code that were removed as part of the refactoring to the unified `Transaction` model.

- **Zustand Store (`store.ts`):**
  - `Income` and `Donation` interfaces. (Removed)
  - `incomes: Income[]` state array. (Removed)
  - `donations: Donation[]` state array. (Removed)
  - `requiredDonation: number` state field. (Removed)
  - Actions: `addIncome`, `addDonation`, `removeIncome`, `removeDonation`, `updateIncome`, `updateDonation`. (Removed)
- **Data Service (`dataService.ts`):**
  - Functions: `addIncome`, `addDonation`, `getIncomes`, `getDonations`. (Removed)
  - Imports for `Income`, `Donation`. (Removed)
- **Rust Backend (`src-tauri/src/main.rs`):**
  - `Income` and `Donation` structs. (Removed)
  - Commands: `add_income`, `add_donation`, `get_incomes`, `get_donations`. (Removed)
  - Removal of the above commands from the `.invoke_handler(...)`. (Done)
  - Removal of `CREATE TABLE IF NOT EXISTS incomes` and `CREATE TABLE IF NOT EXISTS donations` from the `init_db` command. (Done)
  - Removal of `DELETE FROM incomes` and `DELETE FROM donations` from the `clear_all_data` command. (Done)
- **Database (SQLite - `Ten10.db`):**
  - The `incomes` table. (Will be removed on next `init_db`)
  - The `donations` table. (Will be removed on next `init_db`)
- **Frontend Components:**
  - `src/components/IncomeForm.tsx` (Removed)
  - `src/components/DonationForm.tsx` (Removed)
  - `src/components/tables/TransactionsDataTable.tsx` (Removed)
- **Pages:**
  - Removed old `DonationsPage.tsx`.
  - `IncomePage.tsx` refactored and renamed to `AddTransactionPage.tsx`.
- **Other:**
  - Unused imports related to old structures/components removed from `App.tsx` and `Sidebar.tsx`. (Done)

## 11. Data Import and Export (Desktop)

The application supports exporting all transaction data to a JSON file and importing data from such a file, allowing for data backup and migration.

### Export Process (Desktop)

1.  **Trigger**: User clicks the "Export Data" button in `SettingsPage.tsx`.
2.  **Platform Check**: Ensures the platform is `desktop` (logic within `SettingsPage.tsx` before calling the exported function).
3.  **Function Call**: `handleExportData` in `SettingsPage.tsx` calls `exportDataDesktop` from `src/lib/dataManagement.ts`.
4.  **Data Retrieval**: The `exportDataDesktop` function calls `invoke<Transaction[]>('get_transactions')` to fetch all transactions from the local SQLite database.
5.  **JSON Conversion**: The retrieved transaction array is converted to a JSON string.
6.  **File Save Dialog**: Tauri's `dialog.save()` API is used to prompt the user for a filename and location.
7.  **File Write**: Tauri's `fs.writeTextFile()` API writes the JSON string to the selected file.
8.  **Permissions**: Requires `dialog > save: true` and `fs > writeFile: true` (or `fs > all: true`) in `tauri.conf.json` allowlist.

### Import Process (Desktop)

1.  **Trigger**: User clicks the "Import Data" button in `SettingsPage.tsx`.
2.  **Platform Check**: Ensures the platform is `desktop` (logic within `SettingsPage.tsx` before calling the exported function).
3.  **Function Call**: `handleImportData` in `SettingsPage.tsx` calls `importDataDesktop` from `src/lib/dataManagement.ts`.
4.  **File Open Dialog**: The `importDataDesktop` function uses Tauri's `dialog.open()` API to allow the user to select a JSON file.
5.  **File Read**: Tauri's `fs.readTextFile()` API reads the content of the selected file.
6.  **JSON Parse & Basic Validation**: The file content is parsed into an array of `Transaction` objects. Basic validation checks if it's an array and if essential fields (e.g., `id`, `amount`) exist.
    - **TODO**: Implement robust validation using Zod schemas (e.g., a comprehensive `transactionSchema` in `src/lib/schemas.ts`).
7.  **User Confirmation**: A `window.confirm` dialog warns the user that existing data will be overwritten and asks for confirmation.
    - **TODO**: Replace with a custom `shadcn/ui AlertDialog` for better UX, integrated within `importDataDesktop` or handled by `SettingsPage.tsx`.
8.  **Clear Existing Data**: If confirmed, `invoke('clear_all_data')` is called to remove existing transactions from SQLite.
    - **Note**: Ensure `clear_all_data` command in Rust is appropriate and only targets transaction data if other settings should persist. Or create/use a more specific command like `clear_all_transactions`.
9.  **Data Insertion**: Each transaction from the imported file is saved to SQLite by calling `invoke('add_transaction', { transaction })`.
10. **Store Update**: After all transactions are imported, `invoke<Transaction[]>('get_transactions')` is called again, and the Zustand store is updated via `useDonationStore.getState().setTransactions()`.
11. **Permissions**: Requires `dialog > open: true` and `fs > readFile: true` (or `fs > all: true`) in `tauri.conf.json` allowlist.
