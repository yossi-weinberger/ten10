# Project Tech Stack and LLM Guidelines

This document outlines the main technologies and conventions used in this project. Please adhere to these when generating or modifying code.

## Core Technologies

- **Language**: **TypeScript** - All new code should be written in TypeScript.
- **Frontend Library**: **React** (v18) - Utilize functional components and Hooks.
- **Desktop Framework**: **Tauri** - Used for building the cross-platform desktop application. The frontend communicates with the Rust backend via Tauri's API (`@tauri-apps/api`). Note the specific `allowlist` configuration in `src-tauri/tauri.conf.json` which restricts available system APIs (only `shell > open` is explicitly enabled).
- **Build Tool**: **Vite** - Handles development server and production builds. Configuration is in `vite.config.ts`.
  - Uses `@vitejs/plugin-react`.
  - Path alias `@` is configured to point to the `src/` directory.
- **Package Manager**: **npm** - Use `npm` for managing dependencies (`package.json` and `package-lock.json`).

## UI and Styling

- **UI Components**: **shadcn/ui** - This is the primary component library, built on top of Radix UI and styled with Tailwind CSS. Prefer using existing `shadcn/ui` components or building new ones following its patterns. Key dependencies include `@radix-ui/react-*`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `tailwindcss-animate`.
- **Styling**: **Tailwind CSS** - Utility-first CSS framework. Configuration is in `tailwind.config.js` and `postcss.config.js`. Use Tailwind utility classes for styling.
- **Icons**: **Lucide Icons (`lucide-react`)** - Preferred icon library. Note the exclusion from Vite's `optimizeDeps` in `vite.config.ts`.

## Application Architecture

- **Routing**: **TanStack Router (`@tanstack/react-router`)** - Handles client-side routing.
- **State Management**: **Zustand** - Used for global state management.
  - The primary historical data store (`useDonationStore` in `src/lib/store.ts`) holds a unified list of all financial events in `transactions: Transaction[]`. This store is mainly used for calculating overall balances (like the total required tithe) and for components that might need access to all transactions without specific table-view filtering. The required tithe balance is calculated dynamically in the frontend using memoized selectors based on this array and is not stored directly in the state.
  - For the main interactive transactions table, a dedicated store, `useTableTransactionsStore` (defined in `src/lib/tableTransactions.store.ts`), manages its specific state. This includes the currently displayed (filtered, sorted, paginated) transactions, loading states, filter criteria, pagination details, and export status. This store fetches its data independently via `transactionService.ts`.
  - **Note: Loading and clearing of the `transactions` state in `useDonationStore` is managed by `AuthContext` based on authentication events.**
- **Forms**: **React Hook Form (`react-hook-form`)** - Used for managing form state and submission.
- **Schema Validation**: **Zod** - Used for data validation, often integrated with React Hook Form via `@hookform/resolvers`.
- **Backend-as-a-Service (BaaS)**: **Supabase (`@supabase/supabase-js`)** - Used for backend functionalities like authentication and database **specifically for the web version**. Communication is done **directly from the frontend client**.
  - **Security Note**: This direct frontend-to-Supabase approach is secure **only if Row Level Security (RLS) is properly configured**. Security is the highest priority.
  - **Client Initialization**: Create a single Supabase client instance using the Supabase URL and **Anon Key** obtained from environment variables (e.g., `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). The Anon Key is designed to be public but is restricted by RLS policies. **NEVER expose the `service_role` key in the frontend code or environment variables accessible to the client.**
  - **Authentication**: Implement user authentication using Supabase Auth methods. Manage auth state globally.
  - **Database Operations**: Perform CRUD operations using the client library primarily on a unified `transactions` table which holds all financial event types. (See `transaction-data-model-and-calculations.md`). The main transactions table interacts with Supabase via specific RPC functions (e.g., `get_paginated_transactions`, `delete_user_transaction`) invoked through `transactionService.ts` for fetching filtered/paginated data, updates, and deletions.
    - **Current DB Schema:** The `transactions` table columns in Supabase now consistently use `snake_case` (e.g., `is_recurring`, `created_at`, `is_chomesh`). This aligns with the TypeScript models and improves overall consistency. The `dataService` and `transactionService` layers have been updated accordingly.
    - **Primary Key (`id`):** The database generates the `uuid` for the `id` column automatically.
  - **Row Level Security (RLS)**: **MANDATORY AND CRITICAL**. Enable and meticulously configure RLS policies within the Supabase dashboard for the `transactions` table and any other tables containing user-specific or sensitive data. Policies MUST ensure users can only access and modify their own data (typically using `auth.uid()`). **Failure to configure RLS correctly is a major security vulnerability.** (RLS is currently enabled and policies are applied for `transactions`).
  - **Zustand Integration**: Fetch/update data between Supabase (`transactions` table) and the Zustand store (`transactions` array), respecting authentication state. **Initial load and clearing on sign-out are triggered via `AuthContext`. Data loading is optimized to occur only on login or when data is stale, rather than on every refresh.**
  - **Known Issue (Chrome Refresh Hang):** A client-side issue exists where the Supabase client may hang on network requests after a page refresh with a persisted session in Chrome/Vite. The current workaround involves decoupling data fetching from the `onAuthStateChange` listener and using a separate `useEffect` in `AuthContext` triggered by user state changes. See `supabase-integration-status.md` for details and the related GitHub issue.
- **Local Database (Desktop)**: The desktop version uses **SQLite** for local offline storage. It also utilizes a unified `transactions` table structure mirroring the model described in `transaction-data-model-and-calculations.md`, using `snake_case` for column names, consistent with the Rust and frontend TypeScript implementations. The main transactions table interacts with the SQLite database via specific Tauri commands (e.g., `get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`) invoked through `transactionService.ts`.

## Utilities and Libraries

- **Date/Time**:
  - **`date-fns`**: For general date manipulations.
  - **`@hebcal/core`**: For Hebrew calendar calculations.
  - **`react-day-picker`**: Used for date range selection (integrated via `shadcn/ui`).
- **Data Export**:
  - **`exceljs`**: For generating Excel files.
  - **`jspdf`** and **`jspdf-autotable`**: For generating PDF files.
- **Unique IDs**:
  - **`nanoid`**: For generating unique identifiers (e.g., for transactions).
- **Linting**: **ESLint** - Configured in `eslint.config.js`. Ensure code adheres to the linting rules.
- **Version Control**: **Git** - Project is managed using Git.

## Development Scripts (`package.json`)

- `dev`: Starts the Vite development server (`vite`).
- `build`: Builds the web application using Vite (`vite build`).
- `lint`: Runs ESLint to check code quality (`eslint .`).
- `preview`: Starts a local server to preview the production build (`vite preview`).
- `tauri`: The main entry point for Tauri CLI commands (e.g., `npm run tauri dev`, `npm run tauri build`). Use this for desktop development and building.

---

Keep these points in mind when generating or modifying code for this project. Prioritize using the established libraries and patterns.
