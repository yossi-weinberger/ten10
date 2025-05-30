# Project Structure Map

This document outlines the file and directory structure of the Ten10 project.

## Inter-Component Interactions and Data Flow

This section details how the different parts of the project interact with each other:

1.  **Frontend (`src`) <-> Backend (`src-tauri`)**:

    - **Communication:** The React frontend communicates with the Rust backend via Tauri's IPC mechanism. Frontend components invoke Rust functions (`#[tauri::command]`) defined in `src-tauri/src/main.rs` using Tauri's `invoke` function. This is often wrapped in service layers:
      - `src/lib/dataService.ts` for general, basic data operations (e.g., initial load to `useDonationStore`, simple add transaction outside table context).
      - `src/lib/transactionService.ts` for complex, table-specific operations (e.g., fetching paginated/filtered transactions via `get_filtered_transactions_handler`, updating via `update_transaction_handler`, deleting via `delete_transaction_handler`, and exporting via `export_transactions_handler` for desktop; or corresponding RPC calls for web).
    - Allowed commands are specified in `tauri.conf.json` under `tauri > allowlist > invoke`.
    - **Events:** The backend can emit events that the frontend listens to, enabling real-time updates or notifications from the backend.
    - **Example Flow:** Clicking a 'Save' button in a form (`src/components/TransactionForm.tsx`) triggers a function that calls `invoke` with the relevant command name (e.g., `add_transaction`) and form data. The Rust code receives the data, processes it (e.g., saves to the DB), and returns a response (success/error) to the frontend.

2.  **Backend (`src-tauri`) <-> Database (`src-tauri/Ten10.db`)**:

    - **Data Access:** The Rust code in `main.rs` handles all interactions with the SQLite database (`Ten10.db`) for the Desktop version. It uses Rust crates (like `rusqlite` or `sqlx`) to execute SQL queries (CRUD operations) for transaction data and other persistent information.
    - **Persistence:** This is where application data is stored persistently in the desktop application.

3.  **Frontend Components (`src`)**:

    - **Composition:** Page components (`src/pages/`) assemble the UI using reusable sub-components (`src/components/`).
    - **Routing:** `src/routes.ts` defines application routes, mapping paths to page components. `src/App.tsx` likely sets up the main Router.
    - **State Management:** A library like Zustand (likely configured in `src/lib/store/` or similar) manages global or shared state (e.g., the list of transactions). React Context (`src/contexts/`) might be used for simpler global state or function propagation.
    - **Logic & Utilities:** Helper functions and business logic (like tithe calculation) reside in `src/lib/`.
    - **Types:** `src/types/` contains shared TypeScript definitions for type safety and consistency.
    - **Transactions Table Specifics:** The interactive transactions table involves `src/pages/TransactionsTable.tsx` which uses `src/components/TransactionsTable/TransactionsTableDisplay.tsx`. This display component orchestrates data fetching and manipulation through `src/lib/tableTransactions.store.ts` (the table's dedicated Zustand store) and `src/lib/transactionService.ts` (which handles backend communication for fetching, updating, deleting, and exporting table data).

4.  **Build Process**:

    - **Frontend:** Vite (`vite.config.ts`) bundles the `src/` code into static assets (HTML, CSS, JS) outputted to the `dist/` directory.
    - **Backend & Packaging:** The Tauri build process (`tauri build` or `tauri dev`) compiles the Rust code (`src-tauri/`), bundles it with the frontend build output (`dist/`) and the `tauri.conf.json` configuration into a native desktop application executable.

5.  **Configuration & Environment**:

    - **Frontend:** `package.json` (Node.js dependencies, scripts), `tsconfig.*.json` (TypeScript settings), `tailwind.config.js` & `postcss.config.js` (styling), `.eslint.config.js` (linting rules).
    - **Backend:** `Cargo.toml` (Rust dependencies, project settings), `tauri.conf.json` (Tauri application settings - permissions, window properties, icons, allowlist, etc.).

6.  **LLM Instructions (`llm-instructions`)**:
    - This directory contains Markdown documents providing development guidelines and context, such as data models (`transaction-data-model-and-calculations.md`), tech stack choices (`project-tech-stack-and-guidelines.md`), specific guides (`desktop-data-saving-guide.md`, `platform-context-api-guide.md`), and this structure map. These documents inform the implementation details in `src/` and `src-tauri/`.

```
/
├── .bolt/                 # Bolt configuration (if used)
├── .git/                  # Git repository data
├── .github/               # GitHub specific files (workflows, etc.) - Assuming based on standard practice, not listed
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
│   │   ├── TransactionsTable/ # Sub-components for the interactive transactions table (Display, Filters, Row, Modal, etc.)
│   ├── contexts/          # React Context providers
│   ├── lib/               # Utility functions and libraries
│   │   ├── dataManagement.ts # Handles data import/export logic
│   │   ├── platformService.ts # Handles platform detection and state
│   │   ├── transactionService.ts # Handles complex CRUD and export operations for the interactive transactions table with the backend
│   │   ├── dbStatsCardsService.ts # Handles fetching of aggregated statistics for StatsCards from the backend
│   │   ├── storeService.ts    # Handles interactions with the Zustand store for loading/saving data (potentially for useDonationStore)
│   │   ├── store.ts           # Zustand store definition (useDonationStore for general data)
│   │   └── tableTransactions.store.ts # Zustand store for managing the state of the interactive transactions table
│   ├── pages/             # Page components (mapped by router)
│   │   └── TransactionsTable.tsx # Main page component for the interactive transactions table
│   ├── types/             # TypeScript type definitions
│   ├── App.tsx            # Main application component
│   ├── index.css          # Global CSS styles
│   ├── main.tsx           # Application entry point
│   ├── routes.ts          # Route definitions
│   └── vite-env.d.ts      # Vite environment types
├── src-tauri/             # Backend source code (Rust + Tauri)
│   ├── icons/             # Application icons
│   ├── src/               # Rust source code
│   │   └── main.rs        # Main Rust application entry point and backend logic
│   ├── target/            # Rust build output directory
│   ├── build.rs           # Rust build script
│   ├── Cargo.lock         # Rust dependency lock file
│   ├── Cargo.toml         # Rust project manifest and dependencies
│   ├── tauri.conf.json    # Tauri configuration file
│   └── Ten10.db          # SQLite database file (for Desktop version)
├── .eslint.config.js    # ESLint configuration
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
