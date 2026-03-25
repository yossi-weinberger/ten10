# Project Tech Stack and LLM Guidelines

This document outlines the main technologies and conventions used in this project. Please adhere to these when generating or modifying code.

## Core Technologies

- **Language**: **TypeScript** - All new code should be written in TypeScript.
- **Frontend Library**: **React** (v18) - Utilize functional components and Hooks.
- **Desktop Application**: **Tauri (v2)** - For building a cross-platform desktop application from the React codebase. Requires Rust knowledge for the backend part (`src-tauri`).
  - **Tauri Plugins Used**:
    - `@tauri-apps/plugin-os`: For platform detection.
    - `@tauri-apps/plugin-notification`: For sending native system notifications.
    - `@tauri-apps/plugin-autostart`: To enable the application to launch on system startup.
    - `@tauri-apps/plugin-dialog`: For native file save/open dialogs (used in Analytics PDF export).
    - `@tauri-apps/plugin-fs`: For writing files to the local filesystem (used in Analytics PDF export).
- **Build Tool**: **Vite** - Handles development server and production builds. Configuration is in `vite.config.ts`.
  - Uses `@vitejs/plugin-react`.
  - Path alias `@` is configured to point to the `src/` directory.
  - **Tauri Build Note:** When building for Tauri, it is critical to set `base: './'` in `vite.config.ts`. This ensures that asset paths in the final `index.html` are relative (e.g., `./assets/index.js`), which is required for the application to load correctly when served from the local file system by Tauri. Without this, the build will fail to load with a blank screen.
- **Package Manager**: **npm** - Use `npm` for managing dependencies (`package.json` and `package-lock.json`).

## UI and Styling

- **UI Components**: **shadcn/ui** - This is the primary component library, built on top of Radix UI and styled with Tailwind CSS. Prefer using existing `shadcn/ui` components or building new ones following its patterns. Key dependencies include `@radix-ui/react-*`, `class-variance-authority`, `clsx`, `tailwind-merge`, and `tailwindcss-animate`.
- **Styling**: **Tailwind CSS** - Utility-first CSS framework. Configuration is in `tailwind.config.js` and `postcss.config.js`. Use Tailwind utility classes for styling. The project leverages Tailwind's built-in support for `rtl:` variants, which are automatically active when the HTML `dir` attribute is set to `rtl`.
- **Icons**: **Lucide Icons (`lucide-react`)** - Preferred icon library. Note the exclusion from Vite's `optimizeDeps` in `vite.config.ts`.

### RTL/LTR Implementation Strategy

The application follows a clear strategy for handling text directionality:

1.  **Global Direction:** The `dir` attribute on the root `<html>` element is set dynamically in `App.tsx` based on the current language from `i18next`.
2.  **Custom `i18n.dir()` Function:** A custom `i18n.dir()` function was added to `i18n.ts` (and declared in `declarations.d.ts`) to provide the current direction (`'rtl'` or `'ltr'`) to components. This is used to conditionally apply styles or logic.
3.  **Tailwind Variants:** Layout adjustments are primarily handled using Tailwind's built-in `rtl:` variants (e.g., `rtl:order-1`, `rtl:flex-row-reverse`), which work automatically when `dir="rtl"` is set. This is preferred over conditional classes in JSX.
4.  **Component-Level `dir`:** In some complex components or where parent context is insufficient (e.g., `shadcn/ui` dialogs or scroll areas), the `dir={i18n.dir()}` prop is passed directly to ensure correct rendering.

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
  - **Security Hardening**: See `llm-instructions/backend/security-hardening-jan-2026.md` for CORS, RLS, CSP, and SQL function security configurations.
- **Local Database (Desktop)**: The desktop version uses **SQLite** for local offline storage. It utilizes a unified `transactions` table and a `recurring_transactions` table. The main transactions table interacts with the SQLite database via specific Tauri commands (e.g., `get_filtered_transactions_handler`, `update_transaction_handler`, `delete_transaction_handler`, `clear_all_data`) invoked through the service layer.
- **`data-layer` Module (`src/lib/data-layer`)**: This directory contains a set of service files (`transactions.service.ts`, `stats.service.ts`, `dataManagement.service.ts`, etc.) that encapsulate all data-related logic. `data-layer/index.ts` acts as a facade, re-exporting functions from these services for convenient use across the application. This approach isolates data access logic and makes it easy to manage platform-specific implementations.

## Utilities and Libraries

- **Date/Time**:
  - **`date-fns`**: For general date manipulations.
  - **`@hebcal/core`**: For Hebrew calendar calculations.
  - **`react-day-picker`**: Used for date range selection (integrated via `shadcn/ui`).
- **Data Export**:
  - **`exceljs`**: For generating Excel files.
  - **`pdf-lib`** + **`@pdf-lib/fontkit`**: For generating PDF files with embedded fonts (Rubik). Used for both the Transactions Table PDF and the Analytics page PDF.
  - **`html-to-image`**: For capturing rendered React/Recharts DOM elements as PNG images, then embedding them in the Analytics PDF. Uses a double-call pattern to prime SVG/font cache before the actual capture.
  - **`papaparse`**: For generating CSV files.
- **Animations**:
  - **`framer-motion`**: Used for entrance animations, tab content transitions (`AnimatePresence mode="wait"`), and animated counters support.
  - **`react-countup`**: For animated number counting in KPI cards.
- **Charts**:
  - **`recharts`**: Main charting library. Wrapped by shadcn/ui's `ChartContainer`/`ChartTooltipContent` in `src/components/ui/chart.tsx`. Supports area, bar, line, and pie charts.
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

## PDF Export Pattern

The project has two PDF export implementations:

1. **Transactions Table PDF** (`src/lib/utils/export-pdf.ts`): Full-featured table export with columns, row highlighting, logo, page numbers. RTL-aware with `drawRtlText`.

2. **Analytics Page PDF** (`src/pages/AnalyticsPage.tsx` `handleExportPdf`): Chart-based export using `html-to-image` to capture DOM elements, plus text summaries. Uses the same `drawRtlText` from `src/lib/utils/pdf-helpers.ts`.

### Shared PDF Utilities — `src/lib/utils/pdf-helpers.ts`

- **`splitTextSegments(text)`**: Splits Hebrew+number mixed text into typed segments. Regex handles `1,234.56`, dates, times — keeps number internals intact when reversing for RTL.
- **`drawRtlText(page, text, rightX, y, font, size, color)`**: Draws text right-to-left, with embedded numbers staying LTR. Used for Hebrew text with embedded currency amounts.

### Chart Color Variables

Analytics chart components require additional CSS variables in `src/index.css` beyond the original 3:
```
--chart-green, --chart-yellow, --chart-red   (original)
--chart-blue, --chart-purple, --chart-teal, --chart-orange  (added for analytics)
```

### Pie Chart Color Pattern (shadcn ChartConfig)

SVG `fill` attributes cannot resolve CSS custom properties directly. The correct pattern for pie slices in Recharts:

1. Define `slice-0` through `slice-4` keys in `ChartConfig` with actual color values
2. `ChartContainer` injects `--color-slice-N: hsl(...)` as resolved values via `<style>` tag
3. Cell uses `fill={`var(--color-slice-${index % 5})`}` — works because the variable is already resolved

---

Keep these points in mind when generating or modifying code for this project. Prioritize using the established libraries and patterns.
