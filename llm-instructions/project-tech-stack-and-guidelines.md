# Project Tech Stack and LLM Guidelines

This document outlines the main technologies and conventions used in this project. Please adhere to these when generating or modifying code.

## Core Technologies

- **Language**: **TypeScript** - All new code should be written in TypeScript.
- **Frontend Library**: **React** (v18) - Utilize functional components and Hooks.
- **Desktop Application**: **Tauri (v2)** - For building a cross-platform desktop application from the React codebase. Requires Rust knowledge for the backend part (`src-tauri`).
- **Build Tool**: **Vite** - Handles development server and production builds. Configuration is in `vite.config.ts`.
  - Uses `@vitejs/plugin-react`.
  - Path alias `@` is configured to point to the `src/` directory.
  - **Tauri Build Note:** When building for Tauri, it is critical to set `base: './'` in `vite.config.ts`. This ensures that asset paths in the final `index.html` are relative (e.g., `./assets/index.js`), which is required for the application to load correctly when served from the local file system by Tauri. Without this, the build will fail to load with a blank screen.
- **Package Manager**: **npm** - Use `npm` for managing dependencies (`package.json` and `package-lock.json`).

## UI and Styling

- **UI Components**: **shadcn/ui** - This is the primary component library, built on top of Radix UI and styled with Tailwind CSS. Prefer using existing `shadcn/ui` components or building new ones following its patterns. Key dependencies include `@radix-ui/react-*`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `tailwindcss-animate`.
- **Styling**: **Tailwind CSS** - Utility-first CSS framework. Configuration is in `tailwind.config.js` and `postcss.config.js`. Use Tailwind utility classes for styling.
- **Icons**: **Lucide Icons (`lucide-react`)** - Preferred icon library. Note the exclusion from Vite's `optimizeDeps` in `vite.config.ts`.

## Application Architecture

- **Routing**: **TanStack Router (`@tanstack/react-router`)** - Handles client-side routing.
- **State Management**: **Zustand** - Used for global state management.
  - The primary historical data store (`useDonationStore` in `src/lib/store.ts`) holds a unified list of all financial events in `transactions: Transaction[]`. This store is mainly used for calculating overall balances (like the total required tithe) and for components that might need access to all transactions without specific table-view filtering.
  - For the main interactive transactions table, a dedicated store, `useTableTransactionsStore` (defined in `src/lib/tableTransactions/tableTransactions.store.ts`), manages its specific state. This includes the currently displayed (filtered, sorted, paginated) transactions, loading states, filter criteria, pagination details, and export status. This store fetches its data independently via `src/lib/tableTransactions/tableTransactionService.ts`.
  - **Note: The state in `useDonationStore` is not persisted to local storage.** Instead, data is fetched from the appropriate backend (Supabase/SQLite) on application startup, triggered by the `AuthContext`.
- **Forms**: **React Hook Form (`react-hook-form`)** - Used for managing form state and submission.
- **Schema Validation**: **Zod** - Used for data validation, often integrated with React Hook Form via `@hookform/resolvers`.
- **Backend-as-a-Service (BaaS)**: **Supabase (`@supabase/supabase-js`)** - Used for backend functionalities like authentication and database **specifically for the web version**.
  - **Security Note**: This direct frontend-to-Supabase approach is secure **only if Row Level Security (RLS) is properly configured**.
  - **Client Initialization**: A single Supabase client is created in `supabaseClient.ts`.
  - **Authentication**: Implemented using Supabase Auth methods, managed globally via `AuthContext`.
  - **Database Operations**: Performed via the client library. The main transactions table interacts with Supabase via specific RPC functions (e.g., `get_paginated_transactions`, `delete_user_transaction`, `clear_all_user_data`) invoked through the service layer (`tableTransactionService.ts`, `dataManagement.service.ts`).
- **Local Database (Desktop)**: The desktop version uses **SQLite** for local offline storage. It utilizes a unified `transactions` table and a `recurring_transactions` table. The main transactions table interacts with the SQLite database via specific Tauri commands (e.g., `get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`, `clear_all_data`) invoked through the service layer.
- **`data-layer` Module (`src/lib/data-layer`)**: This directory contains a set of service files (`transactions.service.ts`, `stats.service.ts`, `dataManagement.service.ts`, etc.) that encapsulate all data-related logic. `data-layer/index.ts` acts as a facade, re-exporting functions from these services for convenient use across the application. This approach isolates data access logic and makes it easy to manage platform-specific implementations.

## Utilities and Libraries

- **Date/Time**:
  - **`date-fns`**: For general date manipulations.
  - **`@hebcal/core`**: For Hebrew calendar calculations.
  - **`react-day-picker`**: Used for date range selection (integrated via `shadcn/ui`).
- **Data Export**:
  - **`exceljs`**: For generating Excel files.
  - **`jspdf`** and **`jspdf-autotable`**: For generating PDF files.
  - **`papaparse`**: For generating CSV files.
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
