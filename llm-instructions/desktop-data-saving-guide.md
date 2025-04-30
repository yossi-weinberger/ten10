# LLM Guide: Desktop Data Saving and Retrieval Process (Tauri + SQLite with Unified Transaction Model)

This document explains how data (unified `Transaction` objects) is saved locally and retrieved for display when the application runs in a desktop environment using Tauri and SQLite.

**Core Idea:** Implement a platform-specific data persistence layer. On desktop, all financial events are saved as `Transaction` records to a local SQLite database via Tauri's Rust backend. The Zustand store holds the `transactions` array as a cache synchronized with the DB. The required tithe balance is calculated dynamically from this array.

## 1. Platform Detection

- **Context:** `src/contexts/PlatformContext.tsx` provides a React context (`PlatformContext`).
- **Provider:** `PlatformProvider` detects the environment (checks for `window.__TAURI__`) on mount and sets the platform state (`'web'` or `'desktop'`).
- **Hook:** `usePlatform` hook allows components to access the current platform state.
- **Initialization:** `src/App.tsx` uses `useEffect` to call `setDataServicePlatform` once the platform state is determined (not `'loading'`).

## 2. Data Service Abstraction (`dataService.ts`)

- **File:** `src/lib/dataService.ts` acts as the abstraction layer for all data operations related to transactions.
- **State:** It holds the `currentPlatform` variable (set by `setDataServicePlatform`).
- **Add Operation:**
  - `addTransaction(transaction: Transaction)`: Checks `currentPlatform`.
  - If `'desktop'`, it calls Tauri `invoke('add_transaction', { transaction })` to save to the `transactions` table in SQLite.
  - **Crucially, upon successful invocation, it _also_ calls `useDonationStore.getState().addTransaction(transaction)` to update the in-memory `transactions` array in the Zustand store.**
  - If `'web'`, it should eventually call the Supabase API (currently placeholder).
- **Load Operation:**
  - `loadTransactions()`: Checks `currentPlatform`.
  - If `'desktop'`, it calls Tauri `invoke('get_transactions')` to retrieve all `Transaction` records from the SQLite `transactions` table. The returned array is used to populate the Zustand store.
  - If `'web'`, it should eventually fetch from Supabase (currently returns empty array).

## 3. Frontend to Backend Communication (Tauri Invoke)

- **Mechanism:** When `currentPlatform` is `'desktop'`, `dataService.ts` (for saving/loading) and `App.tsx` (for initial load) use the `invoke` function imported from `@tauri-apps/api`.
- **Usage (Save):** `await invoke('add_transaction', { transaction: transactionData })`
- **Usage (Load):** `await invoke<Transaction[]>('get_transactions')` (expects `Vec<Transaction>` back)
- **Error Handling:** `try...catch` blocks should wrap `invoke` calls to handle potential errors during DB operations.

## 4. Backend (Rust) Implementation (`src-tauri/src/main.rs`)

- **File:** `src-tauri/src/main.rs` contains the Rust backend logic.
- **Data Structure:** Defines a `Transaction` struct mirroring the TypeScript interface, using `#[derive(Serialize, Deserialize)]` and `#[serde(rename_all = "camelCase")]`.
- **Save Command:** `#[tauri::command] add_transaction(db: State<'_, DbState>, transaction: Transaction)` receives the transaction object, performs an `INSERT` into the `transactions` SQLite table. Handles optional fields and boolean-to-integer conversion (`is_chomesh`).
- **Load Command:** `#[tauri::command] get_transactions(db: State<'_, DbState>)` performs `SELECT * FROM transactions`, maps the results from the database rows back into a `Vec<Transaction>`, handling potential NULLs and integer-to-boolean conversion, and returns the vector.
- **DB Init Command:** `#[tauri::command] init_db(db: State<'_, DbState>)` ensures the `transactions` table exists (`CREATE TABLE IF NOT EXISTS transactions (...)`) with the correct schema. (It might still create old tables temporarily).
- **Clear Command:** `#[tauri::command] clear_all_data(db: State<'_, DbState>)` now also executes `DELETE FROM transactions`.
- **Database Connection:** Managed via `DbState(Mutex<Connection>)`.
- **Handler:** All relevant commands (`init_db`, `add_transaction`, `get_transactions`, `clear_all_data`, etc.) are registered in the `.invoke_handler(...)`.

## 5. Zustand Store (`store.ts`)

- **State:** `useDonationStore` now holds `transactions: Transaction[] = []`. The previous `incomes`, `donations`, and `requiredDonation` fields are deprecated and will be removed.
- **Actions:**
  - `setTransactions(transactions: Transaction[])`: Replaces the entire array (used during initial load).
  - `addTransaction(transaction: Transaction)`: Adds a single transaction to the array (called by `dataService` after successful DB save).
- **Balance Calculation:** The required tithe balance is **not stored** in the state. It's calculated dynamically using a selector.
- **Selector:** `selectCalculatedBalance(state: DonationState): number` uses the imported `calculateTotalRequiredDonation(state.transactions)` function (`src/lib/tithe-calculator.ts`) to compute the balance on demand. Zustand memoizes this selection.

## 6. Database Initialization and Initial Load

- **DB Init Command:** `init_db` ensures the `transactions` table exists.
- **Trigger:** Invoked once from `src/App.tsx` when `platform === 'desktop'`.
- **Initial Data Load:** _Immediately after_ `init_db` succeeds in `App.tsx`:
  1. `dataService.loadTransactions()` is called. This invokes `get_transactions` in Rust.
  2. The returned array (`Vec<Transaction>`) is used to **overwrite** the `transactions` state in the Zustand store using `useDonationStore.setState({ transactions: ... })`. (Old data like incomes/donations might still be loaded temporarily).
  3. This populates the Zustand store (the UI's data source) with the current state of the `transactions` table in the SQLite DB.

## 7. Data Flow Summary (Add Transaction on Desktop)

1. User submits the **unified `TransactionForm`**.
2. `onSubmit` calls `addTransaction(newTransaction)` from `dataService.ts`.
3. `dataService.ts` sees `'desktop'`, calls `invoke('add_transaction', { transaction: newTransaction })`.
4. Rust `add_transaction` saves the `Transaction` object to the SQLite `transactions` table.
5. `invoke` returns successfully.
6. `dataService.ts` **then calls `useDonationStore.getState().addTransaction(newTransaction)`**, updating the `transactions` array in the Zustand store.
7. UI components listening to the Zustand store re-render:
   - `AllTransactionsDataTable` shows the new transaction.
   - `StatsCards` updates the totals and the required balance (via the `selectCalculatedBalance` selector).
   - `MonthlyChart` will include the new transaction in the next month's calculation.

## 8. Data Flow Summary (Displaying Data/Balance on Desktop)

1. **App Startup:** `App.tsx` detects `'desktop'`, calls `init_db`, then `loadTransactions`, populating the `transactions` array in Zustand via `setState`.
2. **UI Rendering (Table):** `AllTransactionsDataTable` uses `useDonationStore((state) => state.transactions)` to get the data array from the store and renders it with pagination.
3. **UI Rendering (Dashboard):**
   - `StatsCards` uses the selector `useDonationStore(selectCalculatedBalance)` to get the dynamically calculated balance and also reads `transactions` to compute totals.
   - `MonthlyChart` uses `useDonationStore((state) => state.transactions)` to calculate and display monthly aggregates.
4. **Updates:** When new data is added (see flow above), the `transactions` array in the store is updated _after_ the DB save, triggering UI re-renders for components subscribed to `transactions` or the calculated balance.

## 9. Key Files (Post-Cleanup)

- `src/types/transaction.ts` (Defines `Transaction` interface)
- `src/contexts/PlatformContext.tsx` (Platform detection)
- `src/App.tsx` (Platform init, DB init via invoke, Initial **transactions** load)
- `src/routes.ts` (Defines application routes and navigation structure)
- `src/lib/dataService.ts` (Abstraction layer: `addTransaction`, `loadTransactions`, `clearAllData`, invoke calls)
- `src/lib/store.ts` (Zustand store: `transactions` array, `settings`, related actions, `selectCalculatedBalance` selector)
- `src/lib/tithe-calculator.ts` (Contains `calculateTotalRequiredDonation` logic)
- **UI Components:**
  - `src/components/forms/TransactionForm.tsx` (Unified form for adding transactions)
  - `src/components/tables/AllTransactionsDataTable.tsx` (Displays all transactions with filters, sorting, etc.)
  - `src/components/dashboard/StatsCards.tsx` (Displays totals & balance)
  - `src/components/dashboard/MonthlyChart.tsx` (Displays monthly aggregates)
  - `src/components/layout/Sidebar.tsx` (Navigation menu)
- **Pages:**
  - `src/pages/HomePage.tsx` (Main dashboard view, likely includes `AllTransactionsDataTable` and `StatsCards`)
  - `src/pages/AddTransactionPage.tsx` (Page dedicated to `TransactionForm`)
  - `src/pages/AnalyticsPage.tsx` (Placeholder for future data analysis)
  - `src/pages/HalachaPage.tsx`, `src/pages/SettingsPage.tsx`, `src/pages/AboutPage.tsx`, `src/pages/ProfilePage.tsx` (Other application pages)
- `src/lib/utils/export-excel.ts` & `src/lib/utils/export-pdf.ts` (Export logic for `AllTransactionsDataTable`)
- `src-tauri/src/main.rs` (Rust: `Transaction` struct, commands for init, add, get, clear; DB logic - **cleaned of Income/Donation**)
- `tenten.db` (The SQLite database file containing **only** the `transactions` table)

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
- **Database (SQLite - `tenten.db`):**
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
