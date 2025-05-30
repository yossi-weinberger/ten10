# Detailed Technical Overview: Transactions Table

## 1. Introduction

The Transactions Table is a central component in the Ten10 application, allowing users to view, manage, and analyze all their financial transactions. It presents data clearly and organized, providing tools for filtering, sorting, editing, deleting, and exporting transactions. The table supports Web (via Supabase) and Desktop (via SQLite) platforms, with shared core display and interaction logic, and platform-specific data access.

## 2. Core Components and Functionality

The Transactions Table functionality is implemented through several React components working together to create a cohesive user experience.

### 2.1. `src/pages/TransactionsTable.tsx`

This is the main page component hosting the transactions table. Its primary responsibilities are:

- **Platform Detection:** Uses the `usePlatform` Hook from `PlatformContext` to determine the current runtime environment (web/desktop/loading).
- **Initial Loading State:** Displays a "Loading platform data..." message while the platform is being identified (`platform === "loading"`).
- **Page Structure:** Wraps the main display component (`TransactionsTableDisplay`) and shows a main page title ("Transactions Table").

### 2.2. `src/components/TransactionsTable/TransactionsTableDisplay.tsx`

This is the core table component, managing most of the logic related to data display and interaction.

- **Data Loading:**
  - **Initial Fetch:** Performs an initial data fetch using the `fetchTransactions` action from the global `useTableTransactionsStore`. This fetch occurs when the component loads and the platform is identified (`platform !== "loading"`).
  - **Re-fetch:** Data is also re-fetched when sort settings (`sorting` from the store) change, or when defined filters in the store change. This logic is implemented using `useEffect` listening to these changes.
- **Handling Loading and Error States:**
  - **Loading Skeletons:** Displays a loading animation using the `Skeleton` component when data is loading (`loading === true`) and there are no transactions to display yet (`transactions.length === 0`).
  - **Error Message:** Displays an error message to the user (error taken from the `error` field in the store) if `fetchTransactions` fails.
  - **No Data:** Displays a "No transactions found" message if loading finishes without errors but no transactions matching the criteria are found.
- **Loading More Data (Pagination - "Load More"):**
  - When the user reaches the end of the displayed list and more data is available to load (according to `pagination.hasMore` from the store), clicking the "Load More" button (in `TransactionsTableFooter`) triggers the `setLoadMorePagination` action from the store (to update the current page number). It then calls `fetchTransactions(false, platform)` to fetch the next page of data without resetting already loaded data.
- **Sorting:**
  - Uses the `TransactionsTableHeader` component to display column headers.
  - Allows clicking on sortable column headers (as defined in the `sortableColumns` array). Clicking triggers the `handleSort` function, which in turn calls the `setSorting` action from the store with the selected field name.
- **Transaction Row Actions:**
  - **Edit:** Clicking the "Edit" button on a specific transaction row triggers the `handleEditInitiate` function. This function updates the local `editingTransaction` state with the selected transaction's details and opens the `TransactionEditModal` for editing.
  - **Delete:** Clicking the "Delete" button triggers `handleDeleteInitiate`. This function saves the transaction to be deleted in a local state variable (`transactionToDelete`) and opens an `AlertDialog` for confirmation. After user confirmation, the `handleDeleteConfirm` function calls the `deleteTransaction` action from the store, along with the transaction ID and current platform. Success or error messages for deletion are displayed using `toast`.
- **Main Sub-components:**
  - `TransactionsFilters`: UI for filtering displayed data.
  - `ExportButton`: Button for exporting data to various formats.
  - `Table`, `TableBody`, `TableRow`, `TableCell`: Base table components from `shadcn/ui`.
  - `TransactionsTableHeader`: Component responsible for displaying table headers and managing sort logic.
  - `TransactionRow`: Component responsible for displaying a single transaction row in the table.
  - `TransactionsTableFooter`: Component displaying the "Load More" button and information about the amount of data displayed.

### 2.3. `src/components/TransactionsTable/TransactionsFilters.tsx`

This component allows the user to filter transactions displayed in the table by various criteria.

- **Available Filter Fields:**
  - **Free Text Search:** `Input` field allowing search in transaction description, category, or recipient/payer.
  - **Date Range:** Uses `DatePickerWithRange` component to select start and end dates for filtering.
  - **Transaction Types:** Multiple selection of transaction types from a `DropdownMenu` containing `DropdownMenuCheckboxItem` items. The list of possible types (`availableTransactionTypes`) and their translations (`transactionTypeTranslations`) are defined directly in the component.
- **Filter State Management (Local and Global):**
  - The component uses local `useState` for input values (e.g., `localSearch`, `localDateRange`, `localTypes`). This provides a responsive user experience and prevents too frequent updates to the global store.
  - Free text search value is synchronized to the global store (`setStoreFilters({ search: localSearch })`) using a 500ms `setTimeout` to prevent multiple data fetches while the user types.
  - Changes in date range and transaction type selection directly update the global store (`setStoreFilters`).
- **Reset Filters:**
  - "Reset Filters" button resets the local state of filter fields to their initial values (defined in `initialTableTransactionFilters`). It also calls the `resetStoreFiltersState` action from the store (resetting the filters object in the store) and triggers a data re-fetch (if the platform is not loading).
- **Automatic Data Fetching:**
  - A change in `storeFilters` (caused by user changing a filter) triggers a data re-fetch. The logic for this fetch is in `TransactionsTableDisplay.tsx`, within a `useEffect` listening to changes in `storeFilters` and `platform`.

### 2.4. `src/components/TransactionsTable/TransactionsTableHeader.tsx`

This component is responsible for displaying column headers in the table and implementing interactive sorting logic.

- **Props:** Receives current sort settings (`sorting: TableSortConfig`), a function to update sorting (`handleSort`), and a list of sortable columns (`sortableColumns`).
- **Interactivity:** Each sortable column header is clickable. Clicking a header calls the `handleSort` function with the field name of the relevant column.
- **Sort Indication:** Displays arrow icons (up, down, or both - using `ArrowUp`, `ArrowDown`, `ChevronsUpDown` components from `lucide-react`) next to each sortable column. The icon changes based on the current sort state (whether the field is currently sorted, and in which direction - ascending or descending).

### 2.5. `src/components/TransactionsTable/TransactionRow.tsx`

This component is responsible for displaying a single transaction row in the transactions table.

- **Props:** Receives a `transaction` object representing a single transaction, and `onEdit` and `onDelete` functions as parameters.
- **Data Formatting for Display:**
  - **Date:** Formatted for "dd/MM/yyyy" display (specific to `he-IL` localization).
  - **Amount:** Formatted as a number with two decimal places.
  - **Transaction Type:** Displays a colored `Badge` component containing the translated label of the transaction type (labels taken from `transactionTypeLabels` object). The badge's background color is determined by color settings in `typeBadgeColors` object and applied using the `cn` (classnames) function.
  - **Boolean Values:** Fields like `is_chomesh` and `is_recurring` are formatted for display as "Yes" or "No" using the `formatBoolean` function.
  - **Textual Fields:** Fields like description, category, and recipient/payer are displayed as is. If a field is empty, "-" is displayed.
- **Actions Menu:** Displays a `DropdownMenu` triggered by a three-dot icon (`MoreHorizontal`). The menu contains "Edit" (with `Edit3` icon) and "Delete" (with `Trash2` icon and red color for emphasis) options.

### 2.6. `src/components/TransactionsTable/TransactionEditModal.tsx`

A popup modal allowing the user to edit the details of an existing transaction.

- **Form Management and Validation:**
  - Uses `react-hook-form` library to manage form state.
  - Uses `zodResolver` to perform input validation against a defined schema (`transactionUpdateSchema`). This schema is based on `transactionBaseSchema` but allows partial data updates and does not require filling server fields like `created_at` (as these are set by the server).
- **Initial Form Population:**
  - When the modal opens with a specific transaction (passed via the `transaction` prop), form fields are populated with existing transaction values. The date field is converted to `yyyy-MM-dd` format required by a `date` type input field.
  - If no transaction is passed (a state that should not occur in current usage), the form is initialized with empty or default values.
- **Form Fields:**
  - Includes input fields for: date, description, amount, currency (`Select` component with `currencyOptions`), transaction type (`Select` component with `TransactionTypeValues` and labels from `transactionTypeLabels`), category, and recipient/payer.
  - Contains `Checkbox` for "Chomesh deduction?" (`is_chomesh`) and "Recurring transaction?" (`is_recurring`).
  - If "Recurring transaction" is checked, an additional input field for "Day of month for recurring transaction" (`recurring_day_of_month`) appears.
- **Form Submission Logic (`onSubmit`):**
  - Ensures a transaction to edit actually exists (`transaction.id`) and the platform is not in a loading state.
  - Builds an `updatePayload` object containing only fields the user can change and actually changed. Boolean fields are always sent. Empty or `null` fields are handled accordingly (e.g., if `is_recurring` is not checked, `recurring_day_of_month` is set to `null`).
  - Calls the `updateTransaction` action from the global store, passing it the transaction ID, the `updatePayload` containing changes, and the current platform.
  - Upon successful update, the modal closes. Potential errors are logged to the console.

### 2.7. `src/components/TransactionsTable/ExportButton.tsx`

This component allows the user to export the data currently displayed in the table (after applying active filters).

- **User Interface:** Uses a `DropdownMenu` component to offer the user three export formats: Excel (XLSX), PDF, and CSV.
- **Export Logic:**
  - Upon selecting an export format, the component calls the `exportTransactions(format, platform)` action from the global store. The current platform (`platform`) is taken from `PlatformContext`.
- **Loading Indication and Error Handling:**
  - Displays a visual loading indicator (spinning `Loader2` icon and "Exporting..." text) and controls the `disabled` state of the button and menu items while the export process is ongoing (based on the `exportLoading` flag from the store).
  - Displays `toast` messages from the `sonner` library (success or error message) upon completion of the export operation. Message display is triggered by `useEffect` listening to changes in `exportLoading` and `exportError` flags from the store.

### 2.8. `src/components/TransactionsTable/TransactionsTableFooter.tsx`

This component is responsible for displaying the bottom part of the transactions table, including pagination options and information about the amount of data displayed.

- **"Load More" Button:** Displays a "Load More" button when more data is available to load (`pagination.hasMore` from the store) and loading is not currently in progress. Clicking the button calls the `handleLoadMore` function passed as a prop from the parent component (`TransactionsTableDisplay`).
- **Data Count Information:** Displays text indicating how many transactions are currently displayed out of the total number of transactions meeting the criteria (information taken from `transactionsLength` and `pagination.totalCount` fields).
- **Loading Indication:** Displays a loading indicator ("Loading more data..." with a spinning `Loader2` icon) when the `loading` flag from the store is `true` and transactions are already displayed (i.e., this is loading "more" data, not an initial table load).

## 3. Central State Management (`src/lib/tableTransactions.store.ts`)

The Zustand global store, `useTableTransactionsStore`, centralizes all state and business logic directly related to the transactions table.

- **Main State Fields:**
  - `transactions: Transaction[]`: Array of current transactions displayed in the table.
  - `loading: boolean`: Flag indicating if data is currently being fetched from the server.
  - `error: string | null`: String containing an error message in case of data fetching failure, or `null` if no error.
  - `pagination`: Object containing pagination details:
    - `page: number`: Current page number.
    - `limit: number`: Number of items displayed per page.
    - `hasMore: boolean`: Flag indicating if there are more pages to load.
    - `totalCount: number`: Total number of transactions meeting current filter criteria.
  - `filters`: Object containing current filter settings:
    - `search: string`: Free text search string.
    - `dateRange: { from: Date | null; to: Date | null }`: Selected date range.
    - `types: string[]`: Array of transaction types selected for filtering.
  - `sorting`: Object containing current sort settings:
    - `field: SortableField`: Field by which sorting is performed.
    - `direction: "asc" | "desc"`: Sort direction (ascending or descending).
  - `exportLoading: boolean`: Flag indicating if data export is currently in progress.
  - `exportError: string | null`: Error message in case of export failure.
- **Main Actions:**
  - `fetchTransactions(reset: boolean, platform: Platform)`:
    - Responsible for fetching transactions from the backend (by calling an appropriate function in `transactionService`).
    - If `reset` parameter is `true` (e.g., on initial table load or after filter/sort change), the action resets pagination and loads the first page of data.
    - If `reset` is `false` (e.g., when user clicks "Load More"), the action loads the next page of data.
    - Updates `transactions` (adds new data or replaces existing), `loading`, `error`, and `pagination` fields according to the response from the service.
  - `updateTransaction(transactionId: string, updates: Partial<Transaction>, platform: Platform)`:
    - Responsible for updating an existing transaction (by calling `transactionService`).
    - After receiving success confirmation from the server, the action updates the relevant transaction in the local `transactions` array in the store.
  - `deleteTransaction(transactionId: string, platform: Platform)`:
    - Responsible for deleting a transaction (by calling `transactionService`).
    - After receiving success confirmation from the server, the action removes the transaction from the local `transactions` array in the store.
  - `exportTransactions(format: 'csv' | 'excel' | 'pdf', platform: Platform)`:
    - Initiates the data export process. The action fetches all relevant data from the server (unpaginated, but respecting current filters and sorting – by calling `transactionService.getAllTransactionsForExport`). Then, it uses client-side libraries (`exceljs`, `jspdf`, and a custom function for CSV creation) to generate and download the file in the requested format.
    - Updates `exportLoading` and `exportError` flags based on process progress and potential errors.
  - `setFilters(newFilters: Partial<TableTransactionFilters>)`: Updates the filters object in the store.
  - `resetFiltersState()`: Resets the filters object in the store to initial values defined in `initialTableTransactionFilters`.
  - `setSorting(field: SortableField)`: Updates sort settings. If sorting by the same field, sort direction is reversed. If a new field is selected, sorting is done ascending by the new field.
  - `setLoadMorePagination()`: Increments the page number (`page`) in the pagination object for loading the next page's data.
  - `clearStore()`: Resets the entire store state to its initial values (useful, e.g., on user logout).

## 4. Backend Interaction (via `src/lib/transactionService.ts`)

The `tableTransactions.store.ts` store does not communicate directly with the backend (whether Supabase or Tauri). It does so through the `src/lib/transactionService.ts` service file, which exports the `TableTransactionsService` class. This class contains static methods for performing various operations against the backend, according to the platform.

- **`TableTransactionsService.fetchTransactions(params: FetchTransactionsParams)`:**
  (The `params` parameter includes platform, filters, pagination, and sorting)

  - **For Web (Supabase):** This function calls an RPC (Remote Procedure Call) function defined in Supabase (e.g., a function named `get_paginated_transactions` or similar). The Supabase RPC function receives filters, pagination settings, and sorting, and returns the corresponding list of transactions and the total number of transactions matching the filters.
  - **For Desktop (Tauri):** This function calls a Rust command via Tauri's `invoke` interface (e.g., `invoke('get_filtered_transactions_handler', { args: { filters, pagination, sorting } })`). The server-side Rust command will execute an SQL query on the local SQLite file, considering filters, sorting, and pagination. It returns the list of transactions and the total count.

- **`TableTransactionsService.updateTransaction(transactionId: string, updates: Partial<Transaction>, platform: Platform, userId?: string)`:**

  - **For Web (Supabase):** Executes a `supabase.from('transactions').update(updates).eq('id', transactionId).eq('user_id', userId)` call (or similar, ensuring a user can only update their own transactions, via RLS or an RPC function).
  - **For Desktop (Tauri):** Calls a Rust command (e.g., `invoke('update_transaction_handler', { transactionId, updates })`) that will execute an `UPDATE` command on the `transactions` table in the SQLite database.

- **`TableTransactionsService.deleteTransaction(transactionId: string, platform: Platform, userId?: string)`:**

  - **For Web (Supabase):** Executes a `supabase.from('transactions').delete().eq('id', transactionId).eq('user_id', userId)` call (or similar via an RPC function like `delete_user_transaction`).
  - **For Desktop (Tauri):** Calls a Rust command (e.g., `invoke('delete_transaction_handler', { transactionId })`) that will execute a `DELETE` command from the SQLite database.

- **`TableTransactionsService.exportTransactions(filters: ExportTransactionsFilters, sorting: TableSortConfig, platform: Platform, userId?: string)`:**
  - This function is responsible for data export.
  - **For Web (Supabase):** Calls an RPC function (e.g., `export_user_transactions`) that receives filters and sorting and returns all relevant data.
  - **For Desktop (Tauri):** Calls a Rust command (e.g., `invoke('export_transactions_handler', { filters, sorting })`) which fetches all data from SQLite according to filters and sorting.
  - In both cases, the full data (unpaginated) is sent back to the frontend, where it is processed and converted to a file in the requested format (CSV, Excel, PDF).

## 5. Database Queries (Web - Supabase - Conceptual Example)

For the Web platform using Supabase, the `get_filtered_transactions` function (or a similarly named function) triggered via RPC will likely execute a complex SQL query. Below is a schematic illustration of what such a query might look like (this is conceptual SQL only and not necessarily the exact implementation):

```sql
-- Conceptual SQL for a Supabase RPC function: get_filtered_transactions
-- Parameters might include: p_user_id UUID, p_search_term TEXT,
-- p_start_date DATE, p_end_date DATE, p_types TEXT[],
-- p_sort_field TEXT, p_sort_direction TEXT, p_limit INT, p_offset INT

SELECT
    id, user_id, date, amount, currency, description, type, category,
    is_chomesh, is_recurring, recurring_day_of_month, recipient,
    created_at, updated_at,
    (SELECT COUNT(*) FROM public.transactions sub
     WHERE sub.user_id = p_user_id -- Ensure user matches
       AND (p_search_term IS NULL OR sub.description ILIKE '%' || p_search_term || '%' OR sub.category ILIKE '%' || p_search_term || '%' OR sub.recipient ILIKE '%' || p_search_term || '%')
       AND (p_start_date IS NULL OR sub.date >= p_start_date)
       AND (p_end_date IS NULL OR sub.date <= p_end_date)
       AND (p_types IS NULL OR sub.type = ANY(p_types)) -- Filter by array of types
    ) as total_count
FROM
    public.transactions main
WHERE
    main.user_id = p_user_id -- Ensure user matches
    AND (p_search_term IS NULL OR main.description ILIKE '%' || p_search_term || '%' OR main.category ILIKE '%' || p_search_term || '%' OR main.recipient ILIKE '%' || p_search_term || '%')
    AND (p_start_date IS NULL OR main.date >= p_start_date)
    AND (p_end_date IS NULL OR main.date <= p_end_date)
    AND (p_types IS NULL OR main.type = ANY(p_types)) -- Filter by array of types
ORDER BY
    -- Dynamic sorting based on p_sort_field and p_sort_direction
    -- Example (simplified, actual dynamic sorting in SQL can be more complex):
    -- CASE WHEN p_sort_field = 'date' AND p_sort_direction = 'asc' THEN date END ASC,
    -- CASE WHEN p_sort_field = 'date' AND p_sort_direction = 'desc' THEN date END DESC,
    -- Default sort if not specified or invalid:
    created_at DESC
LIMIT p_limit
OFFSET p_offset;
```

**Note:** The actual implementation of a dynamic SQL query, especially regarding dynamic sorting and passing arrays as parameters (like `p_types`), will require attention to PL/pgSQL syntax details (PostgreSQL's function language) or using appropriate server-side query building techniques.

## 6. SQLite Data Fetching Configuration (Desktop Version)

This section describes the steps required to implement data fetching from SQLite for the desktop version, considering filtering, sorting, and pagination. The examples and explanations here are also based on how other components in the project, like `StatsCards.tsx` (via `useServerStats.ts` and `dataService.ts`), access SQLite data through Tauri commands.

### 6.1. Rust Code Update (`src-tauri/src/main.rs`)

- **Data Structure Definitions (Structs) for Parameters and Response:**
  Define Rust data structures to represent filters, pagination, and sorting coming from the frontend, and a data structure for the response that will include the list of transactions and total count.

  ```rust
  // In src-tauri/src/main.rs
  // Ensure you have `serde::{Deserialize, Serialize}` derives for these structs

  #[derive(serde::Deserialize, Debug)]
  pub struct TableFiltersPayload {
      search: Option<String>,
      date_from: Option<String>, // ISO date string "YYYY-MM-DD"
      date_to: Option<String>,   // ISO date string "YYYY-MM-DD"
      types: Option<Vec<String>>,
  }

  #[derive(serde::Deserialize, Debug)]
  pub struct TablePaginationPayload {
      page: usize, // Current page number (1-indexed from frontend)
      limit: usize, // Items per page
  }

  #[derive(serde::Deserialize, Debug)]
  pub struct TableSortingPayload {
      field: String,     // Field to sort by (e.g., "date", "amount")
      direction: String, // "asc" or "desc"
  }

  #[derive(serde::Deserialize, Debug)]
  pub struct GetFilteredTransactionsArgs { // Payload for the Tauri command
      filters: TableFiltersPayload,
      pagination: TablePaginationPayload,
      sorting: TableSortingPayload,
  }

  #[derive(serde::Serialize, Debug)]
  pub struct PaginatedTransactionsResponse { // Response structure
      transactions: Vec<Transaction>, // Assuming your Transaction struct is defined and serializable
      total_count: i64,
  }
  ```

  (Ensure the `Transaction` data structure in Rust matches the one in TypeScript and is serializable with `Serialize`).

- **Create a New Tauri Command (e.g., `get_filtered_transactions_handler`):**
  This command will receive the `args: GetFilteredTransactionsArgs` parameter. It is responsible for building a dynamic SQL query for SQLite and executing it. Building dynamic SQL requires great care to prevent SQL Injection. Using marked parameters (`?`) of the `rusqlite` library is critical.

  ```rust
  use rusqlite::{params, Connection, Result, ToSql, OptionalExtension}; // Ensure imports

  // Assume Transaction struct is defined here with Serialize and potentially Deserialize
  // #[derive(serde::Serialize, serde::Deserialize, Debug, Clone)]
  // pub struct Transaction { ... }

  #[tauri::command]
  fn get_filtered_transactions_handler(
      db_state: tauri::State<'_, super::DbState>, // Assuming DbState is your DB connection state
      args: GetFilteredTransactionsArgs,
  ) -> std::result::Result<PaginatedTransactionsResponse, String> {
      let conn_guard = db_state.0.lock().map_err(|e| format!("DB lock error: {}", e))?;
      let conn = &*conn_guard;

      let mut base_query = "SELECT id, user_id, date, amount, currency, description, type, category, is_chomesh, is_recurring, recurring_day_of_month, recipient, created_at, updated_at FROM transactions".to_string();
      let mut count_query = "SELECT COUNT(*) FROM transactions".to_string();

      let mut where_clauses: Vec<String> = Vec::new();
      let mut sql_params: Vec<Box<dyn ToSql>> = Vec::new();

      // Build WHERE clauses and params based on args.filters
      if let Some(search_term) = &args.filters.search {
          if !search_term.is_empty() {
              where_clauses.push("(description LIKE ?1 OR category LIKE ?2 OR recipient LIKE ?3)".to_string());
              let pattern = format!("%{}%", search_term);
              sql_params.push(Box::new(pattern.clone())); // param 1
              sql_params.push(Box::new(pattern.clone())); // param 2
              sql_params.push(Box::new(pattern));         // param 3
          }
      }
      if let Some(date_from) = &args.filters.date_from {
          if !date_from.is_empty() {
              where_clauses.push(format!("date >= ?{}", sql_params.len() + 1));
              sql_params.push(Box::new(date_from.clone()));
          }
      }
      if let Some(date_to) = &args.filters.date_to {
          if !date_to.is_empty() {
              where_clauses.push(format!("date <= ?{}", sql_params.len() + 1));
              sql_params.push(Box::new(date_to.clone()));
          }
      }
      if let Some(types) = &args.filters.types {
          if !types.is_empty() {
              let placeholders: Vec<String> = types.iter().enumerate().map(|(i, _)| format!("?{}", sql_params.len() + 1 + i)).collect();
              where_clauses.push(format!("type IN ({})", placeholders.join(", ")));
              for t_type in types {
                  sql_params.push(Box::new(t_type.clone()));
              }
          }
      }

      let params_for_rusqlite: Vec<&dyn ToSql> = sql_params.iter().map(|p| p.as_ref()).collect();

      if !where_clauses.is_empty() {
          let where_str = format!(" WHERE {}", where_clauses.join(" AND "));
          base_query.push_str(&where_str);
          count_query.push_str(&where_str);
      }

      // Get total count
      let total_count: i64 = conn.query_row(
          &count_query,
          params_for_rusqlite.as_slice(),
          |row| row.get(0),
      ).map_err(|e| format!("Failed to count transactions: {}", e))?;

      // Apply sorting
      let sort_field = match args.sorting.field.as_str() {
          "date" => "date", "amount" => "amount", "description" => "description",
          "currency" => "currency", "type" => "type", "category" => "category",
          "recipient" => "recipient", _ => "created_at", // Default
      };
      let sort_direction = if args.sorting.direction.to_lowercase() == "asc" { "ASC" } else { "DESC" };
      base_query.push_str(&format!(" ORDER BY {} {}", sort_field, sort_direction));

      // Apply pagination
      let limit = args.pagination.limit;
      let offset = (args.pagination.page.saturating_sub(1)) * limit; // page is 1-indexed
      base_query.push_str(&format!(" LIMIT {} OFFSET {}", limit, offset));

      // Fetch transactions
      let mut stmt = conn.prepare(&base_query)
          .map_err(|e| format!("Failed to prepare statement: {}", e))?;

      let transactions_iter = stmt.query_map(
          params_for_rusqlite.as_slice(),
          |row| {
              // Map row to Transaction struct. Ensure field names and types match.
              // This mapping needs to be robust and handle Option types correctly.
              Ok(Transaction {
                  id: row.get("id")?,
                  user_id: row.get::<_, Option<String>>("user_id").optional()?.flatten(),
                  date: row.get("date")?,
                  amount: row.get("amount")?,
                  currency: row.get("currency")?,
                  description: row.get::<_, Option<String>>("description").optional()?.flatten(),
                  type_str: row.get("type")?, // Assuming 'type' in DB is TEXT
                  category: row.get::<_, Option<String>>("category").optional()?.flatten(),
                  is_chomesh: row.get::<_, Option<i64>>("is_chomesh").optional()?.flatten().map(|v| v != 0),
                  is_recurring: row.get::<_, Option<i64>>("is_recurring").optional()?.flatten().map(|v| v != 0),
                  recurring_day_of_month: row.get::<_, Option<i64>>("recurring_day_of_month").optional()?.flatten().map(|v| v as i32),
                  recipient: row.get::<_, Option<String>>("recipient").optional()?.flatten(),
                  created_at: row.get::<_, Option<String>>("created_at").optional()?.flatten(),
                  updated_at: row.get::<_, Option<String>>("updated_at").optional()?.flatten(),
              })
          },
      ).map_err(|e| format!("Failed to query transactions: {}", e))?;

      let mut transactions_vec = Vec::new();
      for transaction_result in transactions_iter {
          transactions_vec.push(transaction_result.map_err(|e| format!("Failed to map transaction row: {}", e))?);
      }

      Ok(PaginatedTransactionsResponse {
          transactions: transactions_vec,
          total_count,
      })
  }
  ```

  **Important Notes on Rust Code:**

  - **SQL Safety:** Building dynamic SQL queries requires great care. Ensure sort field names (`sort_field`) are validated and not directly injected into the query. For `WHERE` clauses, using question marks (`?`) and passing values via `params` (or `rusqlite::params!`) is the correct and safe way.
  - **Error Handling:** Return `Result` and handle `rusqlite` errors properly, converting them to a clear error string for the frontend.
  - **Conversion to `Transaction` Struct:** Ensure the mapping from SQLite row to Rust `Transaction` struct (which should also be defined in Rust and match TypeScript) is accurate. This includes handling `NULL` values and type conversions (e.g., `INTEGER` in SQLite to `bool` or `Option<i32>` in Rust).
  - **`type` field:** If the `type` field in the DB is `TEXT` (like `income`, `expense`), and in the Rust (and TS) `Transaction` struct it's an Enum or a limited string type, ensure conversions are handled correctly. In the example code, the field is named `type_str` to avoid collision with the `type` keyword in Rust, if the `Transaction` Struct were to include a field named `type`.

- **Command Registration:** Add the new command to the list of commands in `main.rs` within `tauri::generate_handler![...]`. For example: ` .invoke_handler(tauri::generate_handler![..., get_filtered_transactions_handler])`

### 6.2. Update `src/lib/transactionService.ts` (or similar service file in Frontend)

- Create a new function, e.g., `getTransactionsFromDesktopService`, that will receive filter, pagination, and sort objects from the store. **Important: This function (and the Rust command it calls) should not receive `userId` for the desktop platform, as the context is local to the user.**
- This function will call `invoke('get_filtered_transactions_handler', { args: { filters, pagination, sorting } })`, where `args` is the object containing all parameters required by the Rust command.
- The function will return the response received from Rust (`PaginatedTransactionsResponse`).

  ```typescript
  // In a service file like src/lib/transactionService.ts
  import { invoke } from "@tauri-apps/api/tauri";
  import type { Transaction } from "@/types/transaction"; // Assuming Transaction type definition
  import type {
    TableFiltersState,
    TablePaginationState,
    TableSortConfig,
  } from "@/lib/tableTransactions.store"; // Adjust paths as necessary

  // Define the expected Rust response structure in TypeScript
  interface PaginatedTransactionsResponseFromRust {
    transactions: Transaction[];
    total_count: number; // Rust's i64 might be serialized as number or string depending on setup
  }

  // Define the payload structure for the Tauri command, matching Rust's GetFilteredTransactionsArgs
  // Note: No userId is included in this payload for desktop operations.
  interface GetFilteredTransactionsArgsPayload {
    filters: {
      search: string | null;
      date_from: string | null; // "YYYY-MM-DD"
      date_to: string | null; // "YYYY-MM-DD"
      types: string[] | null;
    };
    pagination: {
      page: number; // Current page number (1-indexed)
      limit: number; // Items per page
    };
    sorting: {
      field: string;
      direction: string; // "asc" or "desc"
    };
  }

  export async function getTransactionsFromDesktopService(
    filters: TableFiltersState,
    pagination: TablePaginationState,
    sorting: TableSortConfig
    // No userId parameter needed here for desktop
  ): Promise<PaginatedTransactionsResponseFromRust> {
    const payload: GetFilteredTransactionsArgsPayload = {
      filters: {
        search: filters.search || null,
        date_from: filters.dateRange.from
          ? new Date(filters.dateRange.from).toISOString().split("T")[0]
          : null,
        date_to: filters.dateRange.to
          ? new Date(filters.dateRange.to).toISOString().split("T")[0]
          : null,
        types: filters.types.length > 0 ? filters.types : null,
      },
      pagination: {
        page: pagination.page, // Send current page from store
        limit: pagination.limit, // Send current limit from store
      },
      sorting: {
        field: sorting.field,
        direction: sorting.direction,
      },
    };

    try {
      console.log(
        "Invoking get_filtered_transactions_handler with payload:",
        JSON.stringify(payload)
      );
      // The command name must match exactly what's registered in Rust.
      // The second argument to invoke is an object where keys are argument names in Rust.
      const response = await invoke<PaginatedTransactionsResponseFromRust>(
        "get_filtered_transactions_handler",
        { args: payload } // Pass the payload nested under 'args'
      );
      console.log(
        "Response from desktop (getTransactionsFromDesktopService):",
        response
      );
      return {
        ...response,
        total_count: Number(response.total_count), // Ensure total_count is a number
      };
    } catch (error) {
      console.error("Error fetching transactions from desktop service:", error);
      throw new Error(
        `Failed to fetch transactions from desktop: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }
  ```

### 6.3. Update `src/lib/tableTransactions.store.ts`

- Inside the `fetchTransactions` action, when `platform === 'desktop'`, the action will call the new `getTransactionsFromDesktopService` function.
- It will pass `state.filters`, `state.pagination` (or relevant parts like `page` and `limit`), and `state.sorting` to this function. **No need to pass `userId` to the desktop service function.**
- After receiving the response from Rust, it will update the store's state (`transactions`, `pagination.totalCount`, `pagination.hasMore`).

  ```typescript
  // Inside fetchTransactions action in tableTransactions.store.ts
  // ...
  if (platform === "desktop") {
    const { filters, pagination, sorting } = get(); // Get current state from store
    // No need to get or pass userId for desktop platform
    const currentPageToFetch = reset ? 1 : pagination.page; // Determine page to fetch

    try {
      set({ loading: true, error: null }); // Set loading state

      // Call the new service function for desktop (does not require userId)
      const desktopResponse = await getTransactionsFromDesktopService(
        filters,
        { ...pagination, page: currentPageToFetch }, // Pass relevant pagination info for the request
        sorting
      );

      // Determine new transactions array based on whether it's a reset or load more
      const newTransactions = reset
        ? desktopResponse.transactions
        : [...get().transactions, ...desktopResponse.transactions]; // Append if not reset

      // Update store state with fetched data
      set({
        transactions: newTransactions,
        pagination: {
          ...pagination, // Keep existing limit
          page: currentPageToFetch, // Update current page
          totalCount: desktopResponse.total_count, // Update total count
          hasMore: newTransactions.length < desktopResponse.total_count, // Determine if there's more
        },
        loading: false, // Reset loading state
        error: null, // Clear any previous error
      });
    } catch (err: any) {
      console.error("Error in fetchTransactions (desktop platform):", err);
      set({
        loading: false,
        error: err.message || "Failed to fetch desktop transactions",
      });
    }
  } else if (platform === "web") {
    // ... existing web logic using its own service call ...
  }
  // ...
  ```

This process covers the main required changes. The most complex and critical part is the correct and safe implementation of the Rust command, especially building dynamic SQL queries securely and efficiently. It's important to thoroughly test all edge cases of filters and sorting, and ensure `userId` handling (or its absence) is consistent across all application layers for each platform.
