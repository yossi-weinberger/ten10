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
- **Transaction Type (`TransactionType`)**: Enum/string literal union defining the nature of the transaction and its impact on tithe calculation.
  - `'income'`: Regular income subject to tithe (10% or 20%). Requires `isChomesh: boolean`.
  - `'donation'`: Includes donations, tzedakah, and mitzvah expenses permissible to be paid from tithe funds (e.g., tuition fees for religious studies). Reduces required tithe by 100% of the amount. Requires `recipient: string` (or similar field indicating purpose).
  - `'expense'`: Regular expense (e.g., groceries, utilities). Does not affect tithe calculation.
  - `'exempt-income'`: Income inherently exempt from tithe (e.g., certain gifts, specific stipends, offset rental income). Does not affect tithe calculation. **Note:** Reimbursements for expenses are _not_ exempt income; they should reduce the amount of the original expense recorded (or the expense shouldn't be recorded if fully reimbursed).
  - `'recognized-expense'`: Business or work-related expenses that reduce the income base subject to tithe (e.g., travel, babysitting for work, business investments/ads). Reduces required tithe by 10% of the expense amount.
- **Specific Fields**: Add fields relevant only to certain types (e.g., `isChomesh`, `recipient`, potentially `categoryId` for expenses later).

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

**`transactions` Table Schema Example:**

| Column Name   | Data Type (SQL)                     | Description                                                    | Nullable | Notes                                                             |
| ------------- | ----------------------------------- | -------------------------------------------------------------- | -------- | ----------------------------------------------------------------- |
| `id`          | `TEXT` / `VARCHAR` / `UUID`         | Primary Key, Unique identifier for the transaction             | No       | Use `nanoid` or DB's UUID generation                              |
| `user_id`     | `TEXT` / `VARCHAR` / `UUID`         | Foreign Key to users table (Supabase), Identifier of the owner | Yes      | **Crucial for RLS in Supabase**. Can be NULL in SQLite (Desktop). |
| `date`        | `TEXT` / `DATE`                     | Date of the transaction (YYYY-MM-DD)                           | No       |                                                                   |
| `amount`      | `REAL` / `NUMERIC` / `DECIMAL`      | Transaction amount (positive value)                            | No       | Choose precision as needed                                        |
| `currency`    | `TEXT` / `VARCHAR(3)`               | Currency code (e.g., 'ILS')                                    | No       |                                                                   |
| `description` | `TEXT`                              | User-provided description                                      | Yes      |                                                                   |
| `type`        | `TEXT` / `VARCHAR`                  | Transaction type ('income', 'donation', 'expense', etc.)       | No       | Consider CHECK constraint for valid types                         |
| `category`    | `TEXT` / `VARCHAR`                  | Optional category (e.g., 'Housing', 'Food')                    | Yes      | Primarily for expense types                                       |
| `is_chomesh`  | `BOOLEAN` / `INTEGER(1)`            | Indicates if 20% tithe applies (for 'income' type)             | Yes      | Only relevant for `type = 'income'`, NULL otherwise               |
| `recipient`   | `TEXT`                              | Recipient/purpose of donation (for 'donation' type)            | Yes      | Only relevant for `type = 'donation'`, NULL otherwise             |
| `created_at`  | `TEXT` / `TIMESTAMP WITH TIME ZONE` | Timestamp of creation                                          | Yes      | `DEFAULT CURRENT_TIMESTAMP` recommended                           |
| `updated_at`  | `TEXT` / `TIMESTAMP WITH TIME ZONE` | Timestamp of last update                                       | Yes      | Update using triggers or application logic                        |

## 6. Data Flow Summary

- **Load**: Fetch all `transactions` from DB -> Populate `transactions` array in Zustand store.
- **Display**: Read `transactions` from Zustand store. Calculate balance for display using the memoized selector/`useMemo` calling `calculateTotalRequiredDonation`.
- **Save**: Persist new/updated/deleted `transaction` to DB -> Update `transactions` array in Zustand store.

## 7. Implementation Plan

- Implement and test this new model first for the **Desktop version (SQLite)**.
- Once validated, apply the same model to the **Web version (Supabase)**, ensuring appropriate RLS policies are set on the `transactions` table.
