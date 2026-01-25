# Currency Conversion & Multi-Currency Support Guide

This document outlines the implementation of the multi-currency support and automatic currency conversion feature added in Jan 2026.

## 1. Overview

The system now supports 12 major currencies (ILS, USD, EUR, CAD, GBP, AUD, CHF, ARS, BRL, ZAR, MXN, UAH) and allows users to enter transactions in any of them. The system automatically converts these amounts to the user's **Default Currency** (defined in settings) for aggregation and reporting.

**Key Principle: "Base Currency Architecture"**
- The `amount` field in the database ALWAYS holds the value in the user's **Default Currency**.
- This ensures that all existing calculations (tithe balance, total income charts, etc.) continue to work without modification.
- Original transaction details (original amount, rate, etc.) are stored in separate columns for reference and auditing.

## 2. Database Schema Changes

### `transactions` Table
New columns were added to support conversion metadata:

| Column Name | Type | Description |
|---|---|---|
| `original_amount` | `NUMERIC/REAL` | The amount entered by the user in the source currency. |
| `original_currency` | `VARCHAR(3)` | The currency code of the source transaction (e.g., 'USD'). |
| `conversion_rate` | `NUMERIC/REAL` | The rate used to convert to the default currency (1 Unit Source = X Units Default). |
| `conversion_date` | `DATE` | The date the exchange rate was retrieved. |
| `rate_source` | `VARCHAR` | 'auto' (API) or 'manual' (User entered). |

### `recurring_transactions` Table
The same conversion columns were added to recurring transactions (Jan 2026):

| Column Name | Type | Description |
|---|---|---|
| `original_amount` | `NUMERIC/REAL` | The original amount before conversion (if created with foreign currency). |
| `original_currency` | `VARCHAR(3)` | The original currency code. |
| `conversion_rate` | `NUMERIC/REAL` | The rate used at creation time (locked-in rate). |
| `conversion_date` | `DATE` | The date the rate was set. |
| `rate_source` | `VARCHAR` | 'auto' or 'manual' - indicates how the rate was determined. |

**Important:** When a recurring transaction is created with a foreign currency, the `amount` field stores the **converted** value (in default currency), and the original details are stored in the `original_*` fields. This "locked-in rate" approach ensures consistent transaction generation.

### `profiles` Table
| Column Name | Type | Default | Description |
|---|---|---|---|
| `default_currency` | `VARCHAR(3)` | 'ILS' | The user's primary currency for reports and calculations. |

## 3. Core Logic & Services

### 3.1. Exchange Rate Service (`src/lib/services/exchange-rate.service.ts`)
- **API:** Uses `exchangerate-api.com` (free tier) to fetch live rates.
- **Caching:** Caches rates in-memory for 1 hour to reduce API calls.
- **Offline Support (Desktop):**
  - If the user is offline, the service attempts to fetch the "Last Known Rate" from the local SQLite database (using the most recent transaction with the same currency pair).
  - If no rate is found, the UI forces the user to enter a **Manual Rate**.

### 3.2. Transaction Form (`TransactionForm.tsx`)
- **Currency Picker:** A new UI component allowing selection from 12 currencies (3 common + expansion).
- **Conversion Section:** When a foreign currency is selected:
  - Automatically fetches and displays the rate.
  - Allows switching between "Auto Rate" (API) and "Manual Rate".
  - Shows the calculated total in the default currency.
- **Submission:** Calculates the converted amount (`amount`) and populates the `original_*` fields before saving.

### 3.3. Recurring Transactions

**Form Submission (`TransactionForm.tsx`):**
- When creating a recurring transaction with a foreign currency, the form converts the amount to the default currency **at creation time** and stores both the converted amount and the original details.
- This applies to both "Auto Rate" and "Manual Rate" - the rate is "locked-in" at creation.
- The `amount` field stores the converted value, `original_amount` stores the source value.

**Execution - Web (Edge Function `process-recurring-transactions`):**
- Runs daily via Supabase cron job.
- For each due transaction:
  1. **Check for stored conversion:** If `original_amount` and `original_currency` exist, copy these values directly to the new transaction (use the locked-in rate).
  2. **Legacy fallback:** If no stored conversion and currency differs from default, fetch a live rate from API.
  3. Creates the transaction with proper conversion metadata.

**Execution - Desktop (`RecurringTransactionsService` in TypeScript):**
- Runs on app startup via `App.tsx`.
- For each due transaction with stored conversion details:
  1. **Manual Rate (`rate_source === "manual"`):** Always use the stored rate - user explicitly set it.
  2. **Auto Rate (`rate_source === "auto"`):** Try to fetch a fresh rate from API. If successful, use the fresh rate. If offline/failed, fall back to the stored rate from creation time.
- For legacy transactions without stored conversion: Fetch rate from API (with offline fallback to DB/cache).
- Creates transactions via `addTransaction()`.

**Key Principle:** Never skip a transaction due to rate unavailability. Manual rates are locked forever. Auto rates try to refresh but fall back to stored rates if needed.

**Key Files:**
- Web: `supabase/functions/process-recurring-transactions/index.ts`
- Desktop: `src/lib/services/recurring-transactions.service.ts`

### 3.4. Opening Balance (`OpeningBalanceModal.tsx`)
- Supports setting an opening balance in a foreign currency.
- Stores the converted value as the debt/credit magnitude.
- Updates handle full re-calculation of conversion if currency changes.

## 4. UI/UX Features

- **Settings Lock:** The "Default Currency" setting is **locked** (disabled) if the user has existing transactions. This prevents data inconsistency (e.g., sum of ILS + USD displayed as just numbers).
- **Table Indication:** In the transactions table, converted transactions show a refresh icon. Hovering over the amount reveals a tooltip with the original amount, rate, date, and source.
- **Offline Indication:** The transaction form clearly shows "Offline" status and disables the Auto Rate option if unavailable.

## 5. Migration & Backward Compatibility

- **Existing Data:** Old transactions have `original_amount = NULL`. The UI treats `amount` as the source of truth.
- **Calculations:** RPC functions and Rust commands for sums (`get_total_income`, etc.) remain unchanged, as they sum the `amount` column which is now guaranteed to be in the default currency.

## 6. Future Considerations

- **Historical Rate Updates:** Currently, editing an old transaction does not auto-update the rate to *today's* rate unless the currency is changed. Consider adding a "Refresh Rate" button for edits.
- **Multi-Currency Reporting:** Future reports could allow viewing totals in original currencies before conversion.
