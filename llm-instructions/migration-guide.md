# LLM Guide: Schema Migration Procedure

This guide outlines the recommended steps and considerations for performing schema migrations in the Ten10 application, covering both the web (Supabase/PostgreSQL) and desktop (Tauri v2 / SQLite) environments. The goal is to ensure that schema changes are applied consistently and safely, minimizing the risk of data loss or application instability.

This document outlines the process and considerations for migrating the Ten10 application from its older data model (separate `incomes`, `donations`, `expenses` tables, potentially `camelCase` column names) to a new, unified `transactions` table using `snake_case` for column names and a single `Transaction` data model for all financial events. This migration has largely been accomplished with the implementation of the new interactive transactions table.

## Guiding Principles

1.  **Atomicity**: All schema changes within a single migration step should be atomic. If one part of a migration fails, the entire set of changes in that step should be rolled back (where possible).
2.  **Idempotency**: Migration scripts should ideally be idempotent, meaning they can be run multiple times without causing errors or unintended side effects. This is often handled by "IF EXISTS" or "IF NOT EXISTS" clauses.
3.  **Consistency**: Strive for consistency in naming conventions and data types across both web and desktop databases where feasible, though platform-specific optimizations are acceptable.
4.  **Version Control**: All migration scripts must be committed to version control.
5.  **Testing**: Test migrations thoroughly in a development environment before applying them to production.

## 1. Goals of Migration (Achieved/In Progress)

- **Unified Data Model:** Consolidate all financial events (income, expenses, donations, etc.) into a single `Transaction` type and a corresponding `transactions` database table. (Largely Achieved for new table)
- **Simplified Logic:** Streamline frontend and backend logic for data handling and calculations by working with a single data structure. (Achieved for new table)
- **Improved Consistency:** Enforce `snake_case` for all database column names and corresponding TypeScript model fields to improve code readability and reduce mapping errors. (Achieved for new table and related models)
- **Enhanced Performance & Scalability:** Optimize database queries and frontend processing by working with a structured, unified table. (Ongoing, new table uses optimized queries)
- **Clear Path for Future Features:** Provide a solid foundation for future enhancements like advanced reporting and analytics.

## 2. Key Migration Steps (Largely Completed for New Table Context)

### Step 1: Define the Unified `Transaction` Model and `transactions` Table Schema (Completed)

- **TypeScript Model (`src/types/transaction.ts`):** A comprehensive `Transaction` interface was defined, encompassing all common fields and type-specific fields using `snake_case`.
- **Database Schema (`transactions` table):** The schema for the `public.transactions` table (Supabase) and local SQLite `transactions` table was established with `snake_case` column names, mirroring the TypeScript model. This includes `id (UUID/TEXT)`, `user_id (UUID/TEXT)`, `date (TEXT/DATE)`, `amount (REAL/NUMERIC)`, `currency (TEXT)`, `description (TEXT)`, `type (TEXT)`, `category (TEXT)`, `is_chomesh (BOOLEAN/INTEGER)`, `is_recurring (BOOLEAN/INTEGER)`, `recurring_day_of_month (INTEGER)`, `recipient (TEXT)`, `created_at`, `updated_at`.

### Step 2: Create New Unified `transactions` Table (Completed)

- **Supabase:** The `public.transactions` table was created with RLS enabled and appropriate policies.
- **SQLite (Desktop):** The `init_db` command in Rust (`src-tauri/src/main.rs`) was updated to create the `transactions` table with the new schema if it doesn't exist.

### Step 3: Adapt Backend Logic (Completed for New Table Context)

- \*\*Rust (Desktop - `src-tauri/src/main.rs`):
  - General-purpose commands like `add_transaction_handler` and `get_transactions_handler` were updated/created to work with the unified `transactions` table and `snake_case` model.
  - Specific commands for the interactive table (`get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`, `export_transactions_handler`) were created to interact with the `transactions` table using the new model and providing filtered/paginated results.
- \*\*Supabase (Web):
  - Basic CRUD operations for general use might still be performed directly via the Supabase client library (e.g., in the `data-layer` module) on the `transactions` table.
  - For the interactive transactions table, specific PostgreSQL RPC functions (e.g., `get_paginated_transactions`, `update_user_transaction`, `delete_user_transaction`, `export_user_transactions`) were created. These functions encapsulate the logic for querying and manipulating the `transactions` table, respecting RLS and handling filters, sorting, and pagination.

### Step 4: Update Frontend Code (Completed for New Table Context)

- \*\*State Management (`Zustand`):
  - `useDonationStore` (`src/lib/store.ts`) was simplified to hold a general `transactions: Transaction[]` array (using the new model).
  - `useTableTransactionsStore` (`src/lib/tableTransactions.store.ts`) was introduced to manage the specific state and data for the new interactive transactions table, also using the unified `Transaction` model.
- \*\*Service Layers:
  - The `data-layer` module was updated to interact with the unified `transactions` table for general data loading (into `useDonationStore`) and potentially for adding transactions outside the new table's context.

```sql
-- Example: Add a 'notes' text column to the 'transactions' table
ALTER TABLE public.transactions
ADD COLUMN notes TEXT NULL; -- Or specify a DEFAULT value and/or NOT NULL

-- Example: Add a 'category' column with a default value
ALTER TABLE public.transactions
ADD COLUMN category VARCHAR(255) DEFAULT 'uncategorized' NOT NULL;
```

### b. Modifying a Column Type

PostgreSQL is generally flexible with type changes, but sometimes a `USING` clause is needed for casting.

```sql
-- Example: Change 'amount' from INTEGER to NUMERIC for more precision
ALTER TABLE public.transactions
ALTER COLUMN amount TYPE NUMERIC(10, 2);
```

If direct alteration isn't possible or involves complex data transformation, you might need to:

1. Add a new temporary column.
2. Update the new column with transformed data from the old column.
3. Drop the old column.
4. Rename the new column to the original name.

### c. Renaming a Column

```sql
ALTER TABLE public.transactions
RENAME COLUMN old_column_name TO new_column_name;
```

### d. Deleting a Column

```sql
ALTER TABLE public.transactions
DROP COLUMN IF EXISTS column_to_delete;
```

### e. Adding a New Table

```sql
CREATE TABLE IF NOT EXISTS public.new_table (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 2. Desktop Environment (Tauri / SQLite)

For the desktop application using SQLite with Rust, migrations require a more manual approach for complex changes due to SQLite's limitations with `ALTER TABLE`. Simple additions are straightforward.

**Recommended Tools/Libraries (Rust):**

- **`rusqlite`**: For direct database interaction.
- **`refinery`** or **`sqlx-macros`** (if using `sqlx`): These are popular Rust crates for managing schema migrations. They allow you to write versioned SQL migration files (e.g., `V1__initial_schema.sql`, `V2__add_notes_column.sql`) and apply them programmatically. They often handle version tracking and transactions.

**Common Migration Tasks (SQLite Syntax):**

### a. Adding a New Column

This is well-supported.

```sql
-- Example: Add a 'notes' text column to the 'transactions' table
ALTER TABLE transactions
ADD COLUMN notes TEXT; -- SQLite columns are nullable by default unless specified otherwise.

-- Example: Add a 'category' column with a default value
ALTER TABLE transactions
ADD COLUMN category TEXT DEFAULT 'uncategorized' NOT NULL;
```

**Note:** If adding a `NOT NULL` column to an existing table with data, you _must_ provide a `DEFAULT` value, or the operation will fail.

### b. "Complex" Changes (Dropping a Column, Modifying Type, Renaming Column in older SQLite versions)

SQLite has limited `ALTER TABLE` support for these. The standard workaround is:

1.  **Start a transaction.**
2.  **Create a new table** with the desired schema (e.g., `transactions_new`).
3.  **Copy data** from the old table to the new table, selecting and transforming columns as needed.
    ```sql
    INSERT INTO transactions_new (col1, new_col2, col3)
    SELECT col1, old_col_to_transform, col3
    FROM transactions;
    ```
4.  **Drop the old table.**
    ```sql
    DROP TABLE transactions;
    ```
5.  **Rename the new table** to the original name.
    ```sql
    ALTER TABLE transactions_new RENAME TO transactions;
    ```
6.  **Commit the transaction.**
7.  **Recreate indexes/triggers** if they were on the original table.

Migration libraries like `refinery` can help automate parts of this process by allowing you to define these steps in SQL scripts.

### c. Adding a New Table

```sql
CREATE TABLE IF NOT EXISTS new_table (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (STRFTIME('%Y-%m-%d %H:%M:%f', 'NOW')) -- SQLite way for current timestamp
);
```

## 3. General Workflow for a Schema Change

When you (the user) request a schema change (e.g., "add a 'priority' field to transactions"):

1.  **Clarify Requirements:**

    - **LLM:** "What should be the data type of 'priority' (e.g., number, text)?"
    - **LLM:** "Should it have a default value? If so, what?"
    - **LLM:** "Can it be empty/NULL?"
    - **LLM:** "Does this apply to both web and desktop?"

2.  **Plan the Migration:**

    - **LLM (Internal thought):** Based on the answers, determine the necessary SQL for PostgreSQL and SQLite. Note any complexities for SQLite.

3.  **Implement for Web (Supabase/PostgreSQL):**

    - **LLM:** "I will now generate the migration for the web version."
    - If Supabase CLI is set up for local development:
      - Modify local schema (e.g., via Supabase Studio or SQL).
      - `supabase db diff -f add_priority_to_transactions`
      - Review the generated SQL file.
      - `supabase migration up` (to apply locally if needed, or rely on CI/CD for remote).
    - If writing manually:
      - `supabase migration new add_priority_to_transactions`
      - Edit the new SQL file with the `ALTER TABLE` or `CREATE TABLE` statements.
      - `supabase migration up`.

4.  **Implement for Desktop (SQLite/Rust):**

    - **LLM:** "Now, I will prepare the migration for the desktop version."
    - Create a new migration file according to the convention of your chosen Rust migration library (e.g., `V{next_version_number}__add_priority_to_transactions.sql`).
    - Write the corresponding `ALTER TABLE ADD COLUMN` statement (or the complex sequence if needed) in SQLite syntax.
    - Update the Rust code that initializes/runs migrations (e.g., in `main.rs` or a dedicated DB module) to include this new migration.
    - The Rust application will apply this migration on its next startup when it detects a new version.

5.  **Update Application Code:**

    - Modify TypeScript types/interfaces (e.g., `Transaction` in `src/types/transaction.ts`).
    - Update forms, tables, and any data handling logic (`dataService.ts`, Zustand store, UI components) to reflect the new schema.
    - Update Rust structs and database interaction logic (`src-tauri/src/main.rs`) if new fields are added or changed.

6.  **Testing:**

    - Thoroughly test data entry, display, import/export on both platforms.
    - Verify that existing data is handled correctly after migration.

7.  **Commit Changes:**
    - Commit the migration files (SQL), application code changes (TS, Rust), and this guide if updated.

## Example: Adding a `due_date` to `transactions`

Let's say we want to add an optional `due_date` (TEXT, ISO8601 format) to transactions.

**1. Web (PostgreSQL/Supabase):**

- Migration file (`YYYYMMDDHHMMSS_add_due_date_to_transactions.sql`):
  ```sql
  ALTER TABLE public.transactions
  ADD COLUMN due_date TEXT NULL;
  ```

**2. Desktop (SQLite/Rust):**

- Migration file (e.g., `V3__add_due_date_to_transactions.sql` if using `refinery`):
  ```sql
  ALTER TABLE transactions
  ADD COLUMN due_date TEXT; -- NULL is default
  ```

**3. Application Code Changes:**

- `src/types/transaction.ts`: Add `dueDate?: string;` to `Transaction` interface.
- `src-tauri/src/main.rs`: Add `due_date: Option<String>,` to Rust `Transaction` struct. Update `INSERT` and `SELECT` logic.
- Update `TransactionForm.tsx` to include an optional date picker for `dueDate`.
- Update `AllTransactionsDataTable.tsx` to display `dueDate`.
- Update import/export logic in `dataManagement.ts` to handle `dueDate`.

This guide should serve as a living document. Please update it as our processes evolve or new tools are adopted.
