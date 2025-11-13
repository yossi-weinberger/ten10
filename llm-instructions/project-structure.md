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
│   ├── data-flow-server-calculations-and-cleanup.md
│   ├── desktop-data-saving-guide.md
│   ├── logger-utility-guide.md
│   ├── migration-guide.md
│   ├── multi-language-and-responsive-design-guide.md
│   ├── platform-context-api-guide.md
│   ├── project-overview-and-requirements.md
│   ├── project-structure.md  # This file
│   ├── project-tech-stack-and-guidelines.md
│   ├── recurring-transactions-implementation-guide.md
│   ├── server-side-tithe-balance-calculation-guide.md
│   ├── session_summary_monthly_chart_platform_issues.md
│   ├── supabase-integration-status.md
│   ├── tauri-v2-build-and-platform-detection-summary.md
│   ├── transaction-data-model-and-calculations.md
│   ├── transactions-table-technical-overview.md
├── node_modules/          # Project dependencies
├── public/                # Static assets served directly
│   └── fonts/             # Font files
├── src/                   # Frontend source code (React + TypeScript)
│   ├── components/        # Reusable UI components
│   │   ├── charts/
│   │   │   └── area-chart-interactive.tsx
│   │   ├── dashboard/
│   │   │   ├── MonthlyChart.tsx
│   │   │   ├── StatCards/
│   │   │   │   ├── DonationsStatCard.tsx
│   │   │   │   ├── ExpensesStatCard.tsx
│   │   │   │   ├── IncomeStatCard.tsx
│   │   │   │   ├── MagicStatCard.tsx
│   │   │   │   └── OverallRequiredStatCard.tsx
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
│   │   │   ├── AppLoader.tsx
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
│   │   ├── ui/            # shadcn/ui components and other generic UI elements
│   │   │   ├── accordion.tsx
│   │   │   ├── alert-dialog.tsx
│   │   │   ├── alert.tsx
│   │   │   ├── aspect-ratio.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── breadcrumb.tsx
│   │   │   ├── button.tsx
│   │   │   ├── calendar.tsx
│   │   │   ├── card.tsx
│   │   │   ├── carousel.tsx
│   │   │   ├── chart.tsx
│   │   │   ├── checkbox.tsx
│   │   │   ├── collapsible.tsx
│   │   │   ├── command.tsx
│   │   │   ├── context-menu.tsx
│   │   │   ├── data-table.tsx
│   │   │   ├── date-picker.tsx
│   │   │   ├── date-range-picker.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── drawer.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── form.tsx
│   │   │   ├── hover-card.tsx
│   │   │   ├── input-otp.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── menubar.tsx
│   │   │   ├── navigation-menu.tsx
│   │   │   ├── pagination.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── progress.tsx
│   │   │   ├── radio-group.tsx
│   │   │   ├── resizable.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── select.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── sonner.tsx
│   │   │   ├── switch.tsx
│   │   │   ├── table.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── toast.tsx
│   │   │   ├── toaster.tsx
│   │   │   ├── toggle-group.tsx
│   │   │   ├── toggle.tsx
│   │   │   └── tooltip.tsx
│   │   └── UserInfoDisplay.tsx
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── PlatformContext.tsx
│   ├── hooks/
│   │   ├── useAnimatedCounter.ts
│   │   ├── useDateControls.ts
│   │   └── useServerStats.ts
│   ├── lib/
│   │   ├── currencies.ts
│   │   ├── data-layer/
│   │   │   ├── analytics.service.ts
│   │   │   ├── autostart.service.ts
│   │   │   ├── chart.service.ts
│   │   │   ├── dataManagement.service.ts
│   │   │   ├── index.ts
│   │   │   ├── notification.service.ts
│   │   │   ├── recurringTransactions.service.ts
│   │   │   ├── reminder.service.ts
│   │   │   ├── stats.service.ts
│   │   │   ├── transactionForm.service.ts
│   │   │   └── transactions.service.ts
│   │   ├── dataService.ts
│   │   ├── platformManager.ts
│   │   ├── schemas.ts
│   │   ├── store.ts
│   │   ├── supabaseClient.ts
│   │   ├── tableTransactions/
│   │   │   ├── tableTransactions.store.ts
│   │   │   ├── tableTransactions.types.ts
│   │   │   └── tableTransactionService.ts
│   │   ├── theme.tsx
│   │   ├── tithe-calculator.ts
│   │   ├── utils/
│   │   │   ├── currency.ts
│   │   │   ├── export-csv.ts
│   │   │   ├── export-excel.ts
│   │   │   ├── export-pdf.ts
│   │   │   ├── formatting.tsx
│   │   │   ├── hebrew-date.ts
│   │   │   └── index.ts
│   │   └── utils.ts
│   ├── pages/
│   │   ├── AboutPage.tsx
│   │   ├── AddTransactionPage.tsx
│   │   ├── AnalyticsPage.tsx
│   │   ├── HalachaPage.tsx
│   │   ├── HomePage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── NotFoundPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── SettingsPage.tsx
│   │   ├── SignupPage.tsx
│   │   └── TransactionsTable.tsx
│   ├── types/
│   │   ├── forms.ts
│   │   ├── recurringTransactionLabels.ts
│   │   ├── transaction.ts
│   │   ├── transactionLabels.ts
│   ├── utils/ # Utility functions (if any)
│   ├── App.tsx
│   ├── index.css
│   ├── main.tsx
│   ├── routes.ts
│   └── vite-env.d.ts
├── src-tauri/             # Backend source code (Rust + Tauri)
│   ├── 2.0.0-rc
│   ├── build.rs
│   ├── capabilities/
│   │   └── migrated.json
│   ├── Cargo.toml
│   ├── gen/
│   │   └── schemas/
│   │       ├── acl-manifests.json
│   │       ├── capabilities.json
│   │       ├── desktop-schema.json
│   │       └── windows-schema.json
│   ├── icons/
│   │   ├── 128x128.png
│   │   ├── 128x128@2x.png
│   │   ├── 32x32.png
│   │   ├── icon.icns
│   │   ├── icon.ico
│   │   ├── icon.png
│   │   ├── Square107x107Logo.png
│   │   ├── Square142x142Logo.png
│   │   ├── Square150x150Logo.png
│   │   ├── Square284x284Logo.png
│   │   ├── Square30x30Logo.png
│   │   ├── Square310x310Logo.png
│   │   ├── Square44x44Logo.png
│   │   ├── Square71x71Logo.png
│   │   ├── Square89x89Logo.png
│   │   └── StoreLogo.png
│   ├── src/
│   │   ├── commands/
│   │   │   ├── chart_commands.rs
│   │   │   ├── db_commands.rs
│   │   │   ├── donation_commands.rs
│   │   │   ├── expense_commands.rs
│   │   │   ├── income_commands.rs
│   │   │   ├── mod.rs
│   │   │   ├── recurring_transaction_commands.rs
│   │   │   └── transaction_commands.rs
│   │   ├── main.rs
│   │   └── models.rs
│   ├── tauri.conf.json
│   └── Ten10.db           # SQLite database file (for Desktop version)
├── components.json
├── eslint.config.js
├── index.html             # Main HTML entry point for the frontend
├── package-lock.json      # NPM dependency lock file
├── package.json           # Project manifest and dependencies (Node.js)
├── postcss.config.js      # PostCSS configuration
├── public/
│   ├── fonts/
│   │   ├── Assistant-VariableFont_wght.ttf
│   │   ├── Rubik-Medium.ttf
│   │   ├── Rubik-Regular.ttf
│   │   └── Rubik-SemiBold.ttf
│   ├── icon-192.png
│   ├── icon-512.png
│   ├── loader.css
│   └── manifest.json
├── README.md              # Project README file
├── realistic_data_2023-06_to_2025-05.json
├── tailwind.config.js     # Tailwind CSS configuration
├── ten10_backup_desktop_2025-06-17.json
├── TODO.md                # To-do list or notes
├── tsconfig.app.json      # TypeScript configuration for the application
├── tsconfig.json          # Base TypeScript configuration
├── tsconfig.node.json     # TypeScript configuration for Node.js environment (e.g., Vite config)
├── vercel.json
└── vite.config.ts         # Vite build tool configuration
```
