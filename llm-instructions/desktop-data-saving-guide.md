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

1. User submits the `TransactionForm`.
2. `onSubmit` calls `addTransaction(newTransaction)` from `dataService.ts`.
3. `dataService.ts` sees `'desktop'`, calls `invoke('add_transaction', { transaction: newTransaction })`.
4. Rust `add_transaction` saves the `Transaction` object to the SQLite `transactions` table.
5. `invoke` returns successfully.
6. `dataService.ts` **then calls `useDonationStore.getState().addTransaction(newTransaction)`**, updating the `transactions` array in the Zustand store.
7. UI components (like `AllTransactionsDataTable` or `StatsCards` using the selector) listening to the Zustand store re-render with the updated data or calculated balance.

## 8. Data Flow Summary (Displaying Data/Balance on Desktop)

1. **App Startup:** `App.tsx` detects `'desktop'`, calls `init_db`, then `loadTransactions`, populating the `transactions` array in Zustand via `setState`.
2. **UI Rendering (Table):** Components like `AllTransactionsDataTable` use `useDonationStore((state) => state.transactions)` to get the data array from the store.
3. **UI Rendering (Balance):** Components like `StatsCards` use the selector `useDonationStore(selectCalculatedBalance)` to get the dynamically calculated balance.
4. **Updates:** When new data is added (see flow above), the `transactions` array in the store is updated _after_ the DB save, triggering UI re-renders for components subscribed to `transactions` or the calculated balance.

## 9. Key Files

- `src/types/transaction.ts` (Defines `Transaction` interface)
- `src/contexts/PlatformContext.tsx` (Platform detection)
- `src/App.tsx` (Platform init, DB init via invoke, Initial data load via `dataService`)
- `src/lib/dataService.ts` (Abstraction layer, `addTransaction`, `loadTransactions`, invoke calls)
- `src/lib/store.ts` (Zustand store: `transactions` array, `set/add` actions, `selectCalculatedBalance` selector)
- `src/lib/tithe-calculator.ts` (Contains `calculateTotalRequiredDonation` logic)
- UI Components:
  - `src/components/forms/TransactionForm.tsx` (Unified form)
  - `src/components/tables/AllTransactionsDataTable.tsx` (Table using `transactions` array)
  - `src/components/dashboard/StatsCards.tsx` (Uses `selectCalculatedBalance`)
- `src-tauri/src/main.rs` (Rust: `Transaction` struct, commands for init, add, get, clear; DB logic)
- `tenten.db` (The SQLite database file containing the `transactions` table)

## 10. Post-Refactoring Cleanup (Future Step)

Once the new `Transaction` model is fully implemented, tested, and integrated across all relevant parts of the application (including the Web version), the following deprecated components and code should be removed:

- **Zustand Store (`store.ts`):**
  - `Income` and `Donation` interfaces.
  - `incomes: Income[]` state array.
  - `donations: Donation[]` state array.
  - `requiredDonation: number` state field.
  - Actions: `addIncome`, `addDonation`, `removeIncome`, `removeDonation`, `updateIncome`, `updateDonation`.
- **Data Service (`dataService.ts`):**
  - Functions: `addIncome`, `addDonation`, `getIncomes`, `getDonations`.
  - Imports for `Income`, `Donation`.
- **Rust Backend (`src-tauri/src/main.rs`):**
  - `Income` and `Donation` structs.
  - Commands: `add_income`, `add_donation`, `get_incomes`, `get_donations`.
  - Removal of the above commands from the `.invoke_handler(...)`.
  - Removal of `CREATE TABLE IF NOT EXISTS incomes` and `CREATE TABLE IF NOT EXISTS donations` from the `init_db` command.
  - Removal of `DELETE FROM incomes` and `DELETE FROM donations` from the `clear_all_data` command.
- **Database (SQLite - `tenten.db`):**
  - The `incomes` table.
  - The `donations` table.
- **Frontend Components:**
  - `src/components/IncomeForm.tsx`
  - `src/components/DonationForm.tsx`
  - `src/components/tables/TransactionsDataTable.tsx`
- **Pages:**
  - Potentially simplify or refactor `src/pages/IncomePage.tsx` and `src/pages/DonationsPage.tsx` if they become redundant after the unified table/form are fully integrated (e.g., into a main dashboard or a single transaction history page).
- **Other:**
  - Any remaining unused imports or utility functions related to the old data structures.
