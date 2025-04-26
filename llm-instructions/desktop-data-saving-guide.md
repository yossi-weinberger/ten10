# LLM Guide: Desktop Data Saving and Retrieval Process (Tauri + SQLite)

This document explains how data (Incomes, Donations) is saved locally and retrieved for display when the application runs in a desktop environment using Tauri and SQLite.

**Core Idea:** Implement a platform-specific data persistence layer. On desktop, data is saved to a local SQLite database via Tauri's Rust backend, and the Zustand store acts as a cache synchronized with the DB. On the web, data is saved to and read from the Zustand store (persisted to localStorage).

## 1. Platform Detection

- **Context:** `src/contexts/PlatformContext.tsx` provides a React context (`PlatformContext`).
- **Provider:** `PlatformProvider` detects the environment (checks for `window.__TAURI__`) on mount and sets the platform state (`'web'` or `'desktop'`).
- **Hook:** `usePlatform` hook allows components to access the current platform state.
- **Initialization:** `src/App.tsx` uses `useEffect` to call `setDataServicePlatform` once the platform state is determined (not `'loading'`).

## 2. Data Service Abstraction

- **File:** `src/lib/dataService.ts` acts as the abstraction layer for all data operations.
- **State:** It holds the `currentPlatform` variable (set by `setDataServicePlatform`).
- **Routing (Add):** Functions like `addIncome` and `addDonation` check `currentPlatform`:
  - If `'desktop'`, they call Tauri `invoke` to save to SQLite. **Crucially, upon successful invocation, they _also_ call the corresponding Zustand store action (e.g., `useDonationStore.getState().addIncome(income)`) to update the in-memory cache.**
  - If `'web'`, they only call the Zustand store action.
- **Routing (Get):** Functions like `getIncomes` and `getDonations` **always** read directly from the Zustand store (`useDonationStore.getState().incomes`). The store is assumed to be the single source of truth for the UI, kept in sync with the DB on desktop.

## 3. Frontend to Backend Communication (Tauri Invoke)

- **Mechanism:** When `currentPlatform` is `'desktop'`, `dataService.ts` (for saving) and `App.tsx` (for initial load) use the `invoke` function imported from `@tauri-apps/api`.
- **Usage (Save):** `await invoke('add_income', { income: incomeData })`
- **Usage (Load):** `await invoke('get_incomes')` (expects `Vec<Income>` back)
- **Error Handling:** `try...catch` blocks wrap `invoke` calls.

## 4. Backend (Rust) Implementation

- **File:** `src-tauri/src/main.rs` contains the Rust backend logic.
- **Save Commands:** `add_income`, `add_donation` marked with `#[tauri::command]`, receive data, perform `INSERT` into SQLite.
- **Load Commands:** `get_incomes`, `get_donations` marked with `#[tauri::command]`, perform `SELECT * FROM ...`, map results to `Vec<Income>` or `Vec<Donation>`, and return the vector.
- **Database Connection:** Managed via `DbState`.
- **Data Handling (Serde):** `#[serde(rename_all = "camelCase")]` ensures correct mapping between JS `camelCase` and Rust `snake_case` for both sending and receiving data via `invoke`.
- **Database Interaction (rusqlite):** Uses `conn.execute` for inserts and `conn.prepare`, `stmt.query_map`, `collect` for selects.
- **Handler:** All commands (`init_db`, `add_*`, `get_*`) are registered in the `.invoke_handler(...)`.

## 5. Database Initialization and Initial Load

- **DB Init Command:** `init_db` ensures tables exist (`CREATE TABLE IF NOT EXISTS`).
- **Trigger:** Invoked once from `src/App.tsx` when `platform === 'desktop'`.
- **Initial Data Load:** _Immediately after_ `init_db` succeeds in `App.tsx`:
  1. `Promise.all([invoke('get_incomes'), invoke('get_donations')])` is called.
  2. The returned arrays (`Vec<Income>`, `Vec<Donation>`) are used to **overwrite** the state in the Zustand store using `useDonationStore.setState({ incomes: ..., donations: ... })`.
  3. This populates the Zustand store (the UI's data source) with the current state of the SQLite DB upon application startup.

## 6. Data Flow Summary (Add Income/Donation on Desktop)

1. User submits form.
2. `onSubmit` calls `addIncome` from `dataService.ts`.
3. `dataService.ts` sees `'desktop'`, calls `invoke('add_income', ...)`.
4. Rust `add_income` saves to SQLite.
5. `invoke` returns successfully.
6. `dataService.ts` **then calls `useDonationStore.getState().addIncome(income)`**, updating the Zustand store.
7. UI components listening to the Zustand store re-render with the new income.

## 7. Data Flow Summary (Displaying Data on Desktop)

1. **App Startup:** `App.tsx` detects `'desktop'`, calls `init_db`, then `get_incomes`/`get_donations`, and populates Zustand store via `setState`.
2. **UI Rendering:** Components (e.g., tables) use `useDonationStore()` to get `incomes` and `donations` arrays from the store.
3. **Updates:** When new data is added (see flow above), the store is updated _after_ the DB save, triggering a UI re-render.

## 8. Key Files

- `src/contexts/PlatformContext.tsx` (Platform detection)
- `src/App.tsx` (Platform init, DB init, Initial data load to Zustand)
- `src/lib/dataService.ts` (Abstraction layer, invoke for save, Zustand update after save)
- `src/lib/store.ts` (Zustand store definition, single source of truth for UI)
- UI Components (e.g., `TransactionsTable.tsx`): Read data _only_ from `useDonationStore()`.
- `src-tauri/src/main.rs` (Rust commands for init, add, get; DB logic)
- `tenten.db` (The SQLite database file)
