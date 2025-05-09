# Project Structure Map

This document outlines the file and directory structure of the Ten10 project.

## Inter-Component Interactions and Data Flow

This section details how the different parts of the project interact with each other:

1.  **Frontend (`src`) <-> Backend (`src-tauri`)**:

    - **Communication:** The React frontend communicates with the Rust backend via Tauri's IPC mechanism. Frontend components invoke Rust functions (`#[tauri::command]`) defined in `src-tauri/src/main.rs` using Tauri's `invoke` function (likely wrapped in a service layer, e.g., `src/lib/dataService.ts`). Allowed commands are specified in `tauri.conf.json` under `tauri > allowlist > invoke`.
    - **Events:** The backend can emit events that the frontend listens to, enabling real-time updates or notifications from the backend.
    - **Example Flow:** Clicking a 'Save' button in a form (`src/components/TransactionForm.tsx`) triggers a function that calls `invoke` with the relevant command name (e.g., `add_transaction`) and form data. The Rust code receives the data, processes it (e.g., saves to the DB), and returns a response (success/error) to the frontend.

2.  **Backend (`src-tauri`) <-> Database (`src-tauri/tenten.db`)**:

    - **Data Access:** The Rust code in `main.rs` handles all interactions with the SQLite database (`tenten.db`) for the Desktop version. It uses Rust crates (like `rusqlite` or `sqlx`) to execute SQL queries (CRUD operations) for transaction data and other persistent information.
    - **Persistence:** This is where application data is stored persistently in the desktop application.

3.  **Frontend Components (`src`)**:

    - **Composition:** Page components (`src/pages/`) assemble the UI using reusable sub-components (`src/components/`).
    - **Routing:** `src/routes.ts` defines application routes, mapping paths to page components. `src/App.tsx` likely sets up the main Router.
    - **State Management:** A library like Zustand (likely configured in `src/lib/store/` or similar) manages global or shared state (e.g., the list of transactions). React Context (`src/contexts/`) might be used for simpler global state or function propagation.
    - **Logic & Utilities:** Helper functions and business logic (like tithe calculation) reside in `src/lib/`.
    - **Types:** `src/types/` contains shared TypeScript definitions for type safety and consistency.

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
│   ├── contexts/          # React Context providers
│   ├── lib/               # Utility functions and libraries
│   │   ├── dataManagement.ts # Handles data import/export logic
│   ├── pages/             # Page components (mapped by router)
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
│   └── tenten.db          # SQLite database file (for Desktop version)
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
