# Project Structure Map

This document outlines the file and directory structure of the Ten10 project.

## Inter-Component Interactions and Data Flow

This section details how the different parts of the project interact with each other:

1.  **Frontend (`src`) <-> Backend (`src-tauri`)**:

    - **Communication:** The React frontend communicates with the Rust backend via Tauri's IPC mechanism. Frontend components invoke Rust functions (`#[tauri::command]`). The core backend logic is modular:
      - **`src-tauri/src/models.rs`**: Defines all shared data structures (structs like `Transaction`, `RecurringTransaction`, etc.), acting as a single source of truth for data models.
      - **`src-tauri/src/commands/`**: This directory contains various modules that encapsulate the business logic. Each module (e.g., `transaction_commands.rs`, `db_commands.rs`) exposes a set of `#[tauri::command]` functions.
      - **`src-tauri/src/main.rs`**: Serves as the application entry point. It initializes the database connection and registers all the command handlers from the `commands` modules.
    - **Events:** The backend can emit events that the frontend listens to, enabling real-time updates or notifications from the backend.
    - **Example Flow:** Clicking a 'Save' button in a form (`src/components/forms/TransactionForm.tsx`) triggers a function that calls `invoke` with the relevant command name (e.g., `add_transaction`) and form data. The Rust code in the corresponding command module receives the data, processes it (e.g., saves to the DB), and returns a response (success/error) to the frontend.

2.  **Backend (`src-tauri`) <-> Database (`src-tauri/Ten10.db`)**:

    - **Data Access:** The Rust code in `src-tauri/src/` handles all interactions with the SQLite database (`Ten10.db`) for the Desktop version. It uses the `rusqlite` crate to execute SQL queries (CRUD operations). The database logic is organized into command modules (e.g., `transaction_commands.rs` for transaction-related queries).
    - **Persistence:** This is where application data is stored persistently in the desktop application.

3.  **Frontend Components (`src`)**:

    - **Composition:** Page components (`src/pages/`) assemble the UI using reusable sub-components from `src/components/`. The `components` directory is further organized by feature (e.g., `dashboard`, `forms`, `settings`, `TransactionsTable`) and a shared `ui` directory for generic components (many from `shadcn/ui`).
    - **Routing:** `src/routes.ts` defines application routes, mapping paths to page components. `src/App.tsx` sets up the main Router.
    - **State Management:** Zustand is used for global state management. `src/lib/store.ts` (`useDonationStore`) handles general application state, while `src/lib/tableTransactions/tableTransactions.store.ts` is dedicated to managing the complex state of the interactive transactions table.
    - **Contexts:** React Context (`src/contexts/`) is used for providing app-wide state like authentication (`AuthContext.tsx`) and platform detection (`PlatformContext.tsx`).
    - **Logic & Utilities:** Helper functions and business logic are located in `src/lib/` and `src/lib/utils/`. This includes the data layer module (`src/lib/data-layer`) which handles all backend communication, data management (`dataManagement.service.ts`), and various utilities like formatting and date helpers. The service for the interactive table (`tableTransactionService.ts`) is located in its own module.
    - **Types:** `src/types/` contains shared TypeScript definitions for type safety and consistency.
    - **Transactions Table Specifics:** The interactive transactions table is centered around `src/pages/TransactionsTable.tsx`. It uses components from `src/components/TransactionsTable/` (like `TransactionsTableDisplay.tsx`, `TransactionEditModal.tsx`, etc.). Data flow is managed by `src/lib/tableTransactions/tableTransactions.store.ts` (Zustand store) and `src/lib/tableTransactions/tableTransactionService.ts` (backend communication).

4.  **Build Process**:

    - **Frontend:** Vite (`vite.config.ts`) bundles the `src/` code into static assets (HTML, CSS, JS) outputted to the `dist/` directory.
    - **Backend & Packaging:** The Tauri build process (`tauri build` or `tauri dev`) compiles the Rust code (`src-tauri/`), bundles it with the frontend build output (`dist/`) and the `tauri.conf.json` configuration into a native desktop application executable.

5.  **Configuration & Environment**:

    - **Frontend:** `package.json` (Node.js dependencies, scripts), `tsconfig.*.json` (TypeScript settings), `tailwind.config.js` & `postcss.config.js` (styling), `eslint.config.js` (linting rules).
    - **Backend:** `Cargo.toml` (Rust dependencies, project settings), `tauri.conf.json` (Tauri application settings - permissions, window properties, icons, allowlist, etc.).

6.  **LLM Instructions (`llm-instructions`)**:
    - This directory contains Markdown documents providing development guidelines and context, such as data models (`transaction-data-model-and-calculations.md`), tech stack choices (`project-tech-stack-and-guidelines.md`), specific guides (`desktop-data-saving-guide.md`, `platform-context-api-guide.md`), and this structure map. These documents inform the implementation details in `src/` and `src-tauri/`.

```
/
├── .bolt/                 # Bolt configuration (if used)
├── .git/                  # Git repository data
├── .github/               # GitHub specific files (workflows, etc.)
├── dist/                  # Build output directory for the frontend
├── llm-instructions/      # Instructions and guidelines for LLM development
│   ├── desktop-data-saving-guide.md
│   ├── platform-context-api-guide.md
│   ├── project-overview-and-requirements.md
│   ├── project-structure.md  # This file
│   ├── project-tech-stack-and-guidelines.md
│   └── transaction-data-model-and-calculations.md
├── node_modules/          # Project dependencies
├── public/                # Static assets served directly
│   └── fonts/             # Font files
├── src/                   # Frontend source code (React + TypeScript)
│   ├── components/        # Reusable UI components
│   │   ├── charts/
│   │   │   └── area-chart-interactive.tsx
│   │   ├── dashboard/
│   │   │   ├── StatCards/
│   │   │   │   ├── DonationsStatCard.tsx
│   │   │   │   ├── ExpensesStatCard.tsx
│   │   │   │   ├── IncomeStatCard.tsx
│   │   │   │   ├── MagicStatCard.tsx
│   │   │   │   └── OverallRequiredStatCard.tsx
│   │   │   ├── MonthlyChart.tsx
│   │   │   └── StatsCards.tsx
│   │   ├── forms/
│   │   │   ├── transaction-form-parts/
│   │   │   │   ├── AmountCurrencyDateFields.tsx
│   │   │   │   ├── DescriptionCategoryFields.tsx
│   │   │   │   ├── FormActionButtons.tsx
│   │   │   │   ├── RecurringFields.tsx
│   │   │   │   ├── TransactionCheckboxes.tsx
│   │   │   │   └── TransactionTypeSelector.tsx
│   │   │   └── TransactionForm.tsx
│   │   ├── layout/
│   │   │   ├── PlatformIndicator.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── settings/
│   │   │   ├── CalendarSettingsCard.tsx
│   │   │   ├── ClearDataSection.tsx
│   │   │   ├── FinancialSettingsCard.tsx
│   │   │   ├── ImportExportDataSection.tsx
│   │   │   ├── LanguageAndDisplaySettingsCard.tsx
│   │   │   └── NotificationSettingsCard.tsx
│   │   ├── tables/
│   │   │   └── AllTransactionsDataTable.tsx
│   │   ├── TransactionsTable/
│   │   │   ├── ExportButton.tsx
│   │   │   ├── TransactionEditModal.tsx
│   │   │   ├── TransactionRow.tsx
│   │   │   ├── TransactionsFilters.tsx
│   │   │   ├── TransactionsTableDisplay.tsx
│   │   │   ├── TransactionsTableFooter.tsx
│   │   │   └── TransactionsTableHeader.tsx
│   │   ├── ui/  # shadcn/ui components and other generic UI elements
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   └── UserInfoDisplay.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── PlatformContext.tsx
│   ├── hooks/
│   │   ├── useAnimatedCounter.ts
│   │   ├── useDateControls.ts
│   │   └── useServerStats.ts
│   ├── lib/
│   │   ├── data-layer/
│   │   │   ├── analytics.service.ts
│   │   │   ├── chart.service.ts
│   │   │   ├── dataManagement.service.ts
│   │   │   ├── index.ts
│   │   │   ├── recurringTransactions.service.ts
│   │   │   ├── stats.service.ts
│   │   │   ├── transactionForm.service.ts
│   │   │   └── transactions.service.ts
│   │   ├── tableTransactions/
│   │   │   ├── tableTransactionService.ts
│   │   │   ├── tableTransactions.store.ts
│   │   │   └── tableTransactions.types.ts
│   │   ├── utils/
│   │   │   ├── currency.ts
│   │   │   ├── export-csv.ts
│   │   │   ├── export-excel.ts
│   │   │   ├── export-pdf.ts
│   │   │   ├── formatting.tsx
│   │   │   ├── hebrew-date.ts
│   │   │   └── index.ts
│   │   ├── schemas.ts
│   │   ├── store.ts
│   │   ├── supabaseClient.ts
│   │   ├── theme.tsx
│   │   └── tithe-calculator.ts
│   ├── pages/
│   │   ├── AboutPage.tsx
│   │   ├── AddTransactionPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── HalachaPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── TransactionsTable.tsx
│   ├── types/
│   │   ├── transaction.ts
│   │   └── transactionLabels.ts
│   ├── utils/ # (currently empty)
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── routes.ts
│   └── vite-env.d.ts
├── src-tauri/             # Backend source code (Rust + Tauri)
│   ├── icons/             # Application icons
│   ├── src/               # Rust source code
│   │   ├── commands/      # Backend command modules
│   │   │   ├── chart_commands.rs
│   │   │   ├── db_commands.rs
│   │   │   ├── donation_commands.rs
│   │   │   ├── expense_commands.rs
│   │   │   ├── income_commands.rs
│   │   │   ├── mod.rs
│   │   │   ├── recurring_transaction_commands.rs
│   │   │   └── transaction_commands.rs
│   │   ├── models.rs      # Centralized Rust data models (structs)
│   │   └── main.rs        # Main Rust application entry point and command handler
│   ├── target/            # Rust build output directory
│   ├── build.rs           # Rust build script
│   ├── Cargo.lock         # Rust dependency lock file
│   ├── Cargo.toml         # Rust project manifest and dependencies
│   ├── tauri.conf.json    # Tauri configuration file
│   └── Ten10.db           # SQLite database file (for Desktop version)
├── .eslint.config.js      # ESLint configuration
├── .gitignore             # Files and directories ignored by Git
├── index.html             # Main HTML entry point for the frontend
├── package-lock.json      # NPM dependency lock file
├── package.json           # Project manifest and dependencies (Node.js)
├── postcss.config.js      # PostCSS configuration
├── README.md              # Project README file
├── tailwind.config.js     # Tailwind CSS configuration
├── TODO.md                # To-do list or notes
├── tsconfig.app.json      # TypeScript configuration for the application
├── tsconfig.json          # Base TypeScript configuration
├── tsconfig.node.json     # TypeScript configuration for Node.js environment (e.g., Vite config)
└── vite.config.ts         # Vite build tool configuration
```
