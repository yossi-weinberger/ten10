# LLM Guide: Desktop Data Saving and Retrieval Process (Tauri v2 + SQLite with Unified Transaction Model)

This document explains how data (unified `Transaction` objects) is saved locally and retrieved for display when the application runs in a desktop environment using Tauri and SQLite.

**Core Idea:** Implement a platform-specific data persistence layer. On desktop, all financial events are saved as `Transaction` records to a local SQLite database via Tauri's Rust backend. The Zustand store holds the `transactions` array as a cache synchronized with the DB. The required tithe balance is calculated dynamically from this array.

## 1. Platform Detection

- **Context:** `src/contexts/PlatformContext.tsx` provides a React context (`PlatformContext`).
- **Provider:** `PlatformProvider` detects the environment (checks for `window.__TAURI__`) on mount and sets the platform state (`'web'` or `'desktop'`).
- **Hook:** `usePlatform` hook allows components to access the current platform state.
- **Initialization:** `src/App.tsx` uses `useEffect` to call `setDataServicePlatform` once the platform state is determined (not `'loading'`).

## 2. Data Service Abstraction (`data-layer/index.ts` and `tableTransactions/tableTransactionService.ts`)

- **`src/lib/data-layer/index.ts`**: This is the main entry point for the data layer module. It aggregates and re-exports functions from various service files within the `data-layer` directory (like `transactions.service.ts`), which handle the actual data operations.

  - **State:** The current platform is now typically accessed via the `usePlatform` hook directly where needed, rather than being stored in a central service variable.
  - **Add Operation (General):**
    - An exported `addTransaction` function (originating from `transactions.service.ts`) checks the platform.
    - If `'desktop'`, it calls Tauri `invoke('add_transaction_handler', { transaction })` to save to the `transactions` table in SQLite.
    - **Crucially, upon successful invocation, it _also_ calls `useDonationStore.getState().addTransaction(transaction)` to update the in-memory `transactions` array in the general Zustand store (`useDonationStore`).**
    - If `'web'`, it should eventually call the Supabase API (currently placeholder for general add, table uses specific RPCs).
  - **Load Operation (General):**
    - An exported `loadTransactions` function (from `transactions.service.ts`) checks the platform.
    - If `'desktop'`, it calls Tauri `invoke('get_transactions_handler')` to retrieve all `Transaction` records from the SQLite `transactions` table. The returned array is used to populate the `useDonationStore`.
    - If `'web'`, it should eventually fetch from Supabase (currently returns empty array for general load, table uses specific RPCs).

- **`src/lib/tableTransactions/tableTransactionService.ts` (`TableTransactionsService` class):** This service is specifically designed for the complex interactions of the main interactive transactions table.
  - It provides methods like `fetchTransactions`, `updateTransaction`, `deleteTransaction`, and `exportTransactions`.
  - These methods use `platform` context to call appropriate backend functions:
    - **Desktop (Tauri):** Invokes specific Tauri commands like `get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`, and `export_transactions_handler`.
    - **Web (Supabase):** Invokes specific Supabase RPC functions like `get_paginated_transactions`, `update_user_transaction`, `delete_user_transaction`, and `export_user_transactions`.
  - This service interacts with `useTableTransactionsStore` to update the table's state upon successful operations.

## 3. Frontend to Backend Communication (Tauri Invoke)

- **Mechanism:** When `platform` is `'desktop'`:
  - The data layer services (e.g., `transactions.service.ts`) use `invoke` with commands like `add_transaction_handler` and `get_transactions_handler`.
  - `tableTransactionService.ts` (for table-specific operations) uses `invoke` with commands like `get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`.
- **Usage (Save - General):** `await invoke('add_transaction_handler', { transaction: transactionData })`
- **Usage (Load - General):** `await invoke<Transaction[]>('get_transactions_handler')`
- **Usage (Load - Table Specific):** `await invoke<PaginatedTransactionsResponse>('get_filtered_transactions_handler', { args: { filters, pagination, sorting } })`
- **Error Handling:** `try...catch` blocks should wrap `invoke` calls to handle potential errors during DB operations.

## 4. Backend (Rust) Implementation (`src-tauri/`)

- **Structure:** The Rust backend logic is modularized for clarity and maintainability.
  - **`src-tauri/src/main.rs`**: This file is the main entry point for the Tauri application. Its primary responsibilities are to initialize the database state (`DbState`) and to register all the available backend commands from the different modules in the `.invoke_handler(...)`.
  - **`src-tauri/src/models.rs`**: This central file defines all the shared data structures (e.g., `Transaction`, `RecurringTransaction`, `TransactionForTable`). These structs mirror the TypeScript interfaces and use `#[derive(Serialize, Deserialize)]` for data transfer. The `#[serde(rename_all = "camelCase")]` attribute has been removed to ensure consistency with `snake_case` naming used across the application.
  - **`src-tauri/src/commands/`**: This directory holds the modules containing the actual business logic. Each module defines a set of `#[tauri::command]` functions for a specific domain.
- **Commands:**
  - **`db_commands.rs`**: Contains commands for database management, such as `init_db` (which creates tables if they don't exist) and `clear_all_data`.
  - **`transaction_commands.rs`**: Contains commands for handling transactions, including:
    - `add_transaction_handler`: Saves a single transaction to the SQLite `transactions` table.
    - `get_filtered_transactions_handler`: Fetches paginated, filtered, and sorted transactions for the main table, performing a `LEFT JOIN` with `recurring_transactions` to include all necessary data.
    - `update_transaction_handler`: Updates a specific transaction.
    - `delete_transaction_handler`: Deletes a specific transaction.
    - `export_transactions_handler`: Fetches all transactions matching filters for data export.
  - **`recurring_transaction_commands.rs`**: Manages all logic for recurring transactions.
- **Database Connection:** Managed via `DbState(Mutex<Connection>)` and passed as `State` to each command handler.

## 5. Zustand Store (`store.ts` and `tableTransactions.store.ts`)

- **`useDonationStore` (`src/lib/store.ts`):**

  - **State:** Holds `transactions: Transaction[] = []` for general purposes (e.g., overall tithe calculation). The previous `incomes`, `donations`, and `requiredDonation` fields are deprecated and will be removed.
  - **Actions:**
    - `setTransactions(transactions: Transaction[])`: Replaces the entire array (used during initial general load).
    - `addTransaction(transaction: Transaction)`: Adds a single transaction to the array (called by `data-layer` after successful general DB save).
  - **Balance Calculation:** The overall required tithe balance is **not stored** in the state. It's calculated dynamically using a selector `selectCalculatedBalance(state: DonationState)` which uses `calculateTotalRequiredDonation(state.transactions)`.

- **`useTableTransactionsStore` (`src/lib/tableTransactions/tableTransactions.store.ts`):**
  - **State:** Manages all state related to the interactive transactions table: `transactions` (current page/view), `loading`, `error`, `pagination`, `filters`, `sorting`, `exportLoading`, `exportError`.
  - **Actions:** Provides actions to `fetchTransactions`, `updateTransaction`, `deleteTransaction`, `exportTransactions`, `setFilters`, `setSorting`, `setLoadMorePagination`, etc. These actions typically use `tableTransactionService.ts` for backend communication.

## 6. Database Initialization and Initial Load

- **DB Init Command:** `init_db` ensures the `transactions` table exists.
- **Trigger:** Invoked once from `src/App.tsx` when `platform === 'desktop'`.
- **Initial Data Load (General - `useDonationStore`):** _Immediately after_ `init_db` succeeds in `App.tsx`:
  1. The `loadTransactions()` function from the data layer is called. This invokes `get_transactions_handler` in Rust.
  2. The returned array (`Vec<Transaction>`) is used to **overwrite** the `transactions` state in `useDonationStore` using `useDonationStore.setState({ transactions: ... })`.
  3. This populates `useDonationStore` (used for overall calculations) with the current state of the `transactions` table in the SQLite DB.
- **Initial Data Load (Transactions Table - `useTableTransactionsStore`):**
  - The `TransactionsTableDisplay.tsx` component, upon mount (and after platform identification), triggers `fetchTransactions(true, 'desktop')` from `useTableTransactionsStore`. This fetches the first page of data for the table.

## 7. Data Flow Summary (Add Transaction on Desktop - Table Context)

1. User interacts with the `TransactionEditModal` (for new or existing transaction, initiated from `TransactionsTableDisplay`).
2. `onSubmit` in `TransactionEditModal` calls `updateTransaction` (or a new `addTransactionToTable` if distinct) action in `useTableTransactionsStore`.
3. The store action calls the relevant method in `tableTransactionService.ts` (e.g., `TableTransactionsService.updateTransaction` or a new `addTransaction`).
4. `tableTransactionService.ts` sees `'desktop'`, calls `invoke('update_transaction_handler', { ... })` or `invoke('add_transaction_handler', { ... })` (if `add_transaction_handler` is reused, or a new specific one for table).
5. Rust command saves/updates the `Transaction` object in the SQLite `transactions` table.
6. `invoke` returns successfully.
7. `tableTransactionService.ts` returns success to the store action.
8. The store action updates its local `transactions` array (e.g., adds/modifies the item) and potentially re-fetches or updates pagination if needed.
9. UI components listening to `useTableTransactionsStore` (e.g., `TransactionsTableDisplay`, `TransactionRow`) re-render.

## 8. Data Flow Summary (Displaying Data/Balance on Desktop)

1. **App Startup (General Data):** `App.tsx` detects `'desktop'`, calls `init_db`, then `loadTransactions()`, populating the `transactions` array in `useDonationStore`.
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
- `src/lib/data-layer/` (Directory for data service modules like `transactions.service.ts`, `stats.service.ts`, etc.)
- `src/lib/tableTransactions/tableTransactionService.ts` (Service for interactive table: `fetchTransactions`, `updateTransaction`, `deleteTransaction`, `exportTransactions`)
- `src/lib/store.ts` (Zustand store - `useDonationStore`: general `transactions` array, `settings`, `selectCalculatedBalance` selector)
- `src/lib/tableTransactions/tableTransactions.store.ts` (Zustand store - `useTableTransactionsStore`: table-specific state and actions)
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
- **Rust Backend:**
  - `src-tauri/src/main.rs` (Rust application entry point; registers command handlers)
  - `src-tauri/src/models.rs` (Centralized Rust data structs)
  - `src-tauri/src/commands/` (Directory with all backend business logic and command handlers)
- `Ten10.db` (The SQLite database file containing **only** the `transactions` table)

## 10. Post-Refactoring Cleanup (Completed)

This section documents the deprecated components and code that were removed as part of the refactoring to the unified `Transaction` model.

- **Zustand Store (`store.ts`):**
  - `Income` and `Donation` interfaces. (Removed)
  - `incomes: Income[]` state array. (Removed)
  - `donations: Donation[]` state array. (Removed)
  - `requiredDonation: number` state field. (Removed)
  - Actions: `addIncome`, `addDonation`, `removeIncome`, `removeDonation`, `updateIncome`, `updateDonation`. (Removed)
- **Data Service (`data-layer/` module):**
  - Functions: `addIncome`, `addDonation`, `getIncomes`, `getDonations`. (Removed)
  - Imports for `Income`, `Donation`. (Removed)
- **Rust Backend (`src-tauri/`):**
  - `Income` and `Donation` structs (Removed from `main.rs`, now all models are in `models.rs`).
  - Commands: `add_income`, `add_donation`, `get_incomes`, `get_donations` (Removed from `main.rs`).
  - Removal of the above commands from the `.invoke_handler(...)` in `main.rs`. (Done)
  - Removal of `CREATE TABLE IF NOT EXISTS incomes` and `CREATE TABLE IF NOT EXISTS donations` from the `init_db` command (now in `db_commands.rs`). (Done)
  - Removal of `DELETE FROM incomes` and `DELETE FROM donations` from the `clear_all_data` command (now in `db_commands.rs`). (Done)
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
3.  **Function Call**: `handleExportData` in `SettingsPage.tsx` calls `exportDataDesktop` from `src/lib/data-layer/dataManagement.service.ts`.
4.  **Data Retrieval**: The `exportDataDesktop` function calls a helper `fetchAllTransactionsForExportDesktop`, which in turn calls `invoke<Transaction[]>('export_transactions_handler')` to fetch all transactions matching the (empty) filters from the local SQLite database.
5.  **JSON Conversion**: The retrieved transaction array is converted to a JSON string.
6.  **File Save Dialog**: Tauri's `dialog.save()` API is used to prompt the user for a filename and location.
7.  **File Write**: Tauri's `fs.writeTextFile()` API writes the JSON string to the selected file.
8.  **Permissions**: Requires `dialog > save: true` and `fs > writeFile: true` (or `fs > all: true`) in `tauri.conf.json` allowlist.

### Import Process (Desktop)

1.  **Trigger**: User clicks the "Import Data" button in `SettingsPage.tsx`.
2.  **Platform Check**: Ensures the platform is `desktop` (logic within `SettingsPage.tsx` before calling the exported function).
3.  **Function Call**: `handleImportData` in `SettingsPage.tsx` calls `importDataDesktop` from `src/lib/data-layer/dataManagement.service.ts`.
4.  **File Open Dialog**: The `importDataDesktop` function uses Tauri's `dialog.open()` API to allow the user to select a JSON file.
5.  **File Read**: Tauri's `fs.readTextFile()` API reads the content of the selected file.
6.  **JSON Parse & Basic Validation**: The file content is parsed into an array of `Transaction` objects. Basic validation checks if it's an array and if essential fields (e.g., `id`, `amount`) exist.
    - **TODO**: Implement robust validation using Zod schemas (e.g., a comprehensive `transactionSchema` in `src/lib/schemas.ts`).
7.  **User Confirmation**: A custom `AlertDialog` from `shadcn/ui` is used to warn the user that existing data will be overwritten and asks for confirmation.
8.  **Clear Existing Data**: If confirmed, `clearAllData()` from `dataManagement.service.ts` is called, which invokes `clear_all_data` in Rust to remove existing transactions and recurring transactions from SQLite.
9.  **Data Insertion**: Each transaction from the imported file is saved to SQLite by calling `addTransaction` from `transactions.service.ts`, which invokes `add_transaction_handler`.
10. **Store Update**: After all transactions are imported, `useDonationStore.getState().setLastDbFetchTimestamp(Date.now())` is called to signal that the data has changed and a refresh is needed.
11. **Permissions**: Requires `dialog > open: true` and `fs > readFile: true` (or `fs > all: true`) in `tauri.conf.json` allowlist.

## Utilities and Libraries

- **Data Export**:
  - **`exceljs`**: For generating Excel files.
  - **`jspdf`** and **`jspdf-autotable`**: For generating PDF files.
  - **`papaparse`**: For generating CSV files.
- **Unique IDs**:
  - **`nanoid`**: For generating unique identifiers (e.g., for transactions).
- **Linting**: **ESLint** - Configured in `eslint.config.js`. Ensure code adheres to the linting rules.
- **Backend-as-a-Service (BaaS)**: **Supabase (`@supabase/supabase-js`)** - Used for backend functionalities like authentication and database **specifically for the web version**.
  - **Security Note**: This direct frontend-to-Supabase approach is secure **only if Row Level Security (RLS) is properly configured**.
  - **Client Initialization**: A single Supabase client is created in `supabaseClient.ts`.
  - **Authentication**: Implemented using Supabase Auth methods, managed globally via `AuthContext`.
  - **Database Operations**: Performed via the client library. The main transactions table interacts with Supabase via specific RPC functions (e.g., `get_paginated_transactions`, `delete_user_transaction`, `clear_all_user_data`) invoked through the service layer (`tableTransactionService.ts`, `dataManagement.service.ts`).
- **Local Database (Desktop)**: The desktop version uses **SQLite** for local offline storage. It utilizes a unified `transactions` table and a `recurring_transactions` table. The main transactions table interacts with the SQLite database via specific Tauri commands (e.g., `get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`, `clear_all_data`) invoked through the service layer.
- **`data-layer` Module (`src/lib/data-layer`)**: This directory contains a set of service files (`transactions.service.ts`, `stats.service.ts`, `dataManagement.service.ts`, etc.) that encapsulate all data-related logic. `data-layer/index.ts` acts as a facade, re-exporting functions from these services for convenient use across the application. This approach isolates data access logic and makes it easy to manage platform-specific implementations.

## Current DB Schema:

- \*\*`transactions` table columns in Supabase now consistently use `snake_case` (e.g., `is_recurring`, `created_at`, `is_chomesh`). This aligns with the TypeScript models and improves overall consistency. The `data-layer` services and `tableTransactionService` have been updated accordingly.
- **Primary Key (`id`):** The database generates the `uuid` for the `id` column automatically.
- **Row Level Security (RLS)**: **MANDATORY AND CRITICAL**. Enable and meticulously configure RLS policies within the Supabase dashboard for the `transactions` table and any other tables containing user-specific or sensitive data. Policies MUST ensure users can only access and modify their own data (typically using `auth.uid()`). **Failure to configure RLS correctly is a major security vulnerability.** (RLS is currently enabled and policies are applied for `transactions` and `recurring_transactions`).
- **Zustand Integration**: Fetch/update data between Supabase (`transactions` table) and the Zustand store (`transactions` array), respecting authentication state. **Initial load and clearing on sign-out are triggered via `AuthContext`. Data loading is optimized to occur only on login or when data is stale, rather than on every refresh.**
- **Known Issue (Chrome Refresh Hang):** A client-side issue exists where the Supabase client may hang on network requests after a page refresh with a persisted session in Chrome/Vite. The current workaround involves decoupling data fetching from the `onAuthStateChange` listener and using a separate `useEffect` in `AuthContext` triggered by user state changes. See `supabase-integration-status.md` for details and the related GitHub issue.
- **Local Database (Desktop)**: The desktop version uses **SQLite** for local offline storage. It also utilizes a unified `transactions` table structure mirroring the model described in `transaction-data-model-and-calculations.md`, using `snake_case` for column names, consistent with the Rust and frontend TypeScript implementations. The main transactions table interacts with the SQLite database via specific Tauri commands (e.g., `get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`) invoked through `src/lib/tableTransactions/tableTransactionService.ts`.

## Initial Load Strategy (Pre-loader):

- **Stage 1 (Static Loader)**: A lightweight, static pre-loader is implemented directly in `index.html` with its own dedicated CSS file (`public/loader.css`). It uses a simple HTML structure and a CSS-animated SVG, allowing the browser to render it instantly without waiting for JavaScript. This provides immediate visual feedback to the user.
- **Stage 2 (App Readiness)**: The main React component (`App.tsx`) contains a state (`isAppReady`) that is initially `false`. While false, the component returns `null`, allowing the static loader to remain visible. The state is set to `true` only after all critical asynchronous initializations (like DB setup on desktop) are complete. This creates a seamless transition from the pre-loader to the fully interactive application without any flicker.
