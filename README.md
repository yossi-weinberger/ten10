# Ten10: Financial Management Platform

[![downloads](https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fyossi-weinberger%2Ften10%2Fmain%2F.github%2Fdownloads.json&query=%24.installer_downloads&label=downloads&color=0ea5e9&logo=windows&logoColor=white&style=flat)](https://github.com/yossi-weinberger/ten10/releases)
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/yossi-weinberger/ten10?style=flat&logo=github&logoColor=white&label=release)](https://github.com/yossi-weinberger/ten10/releases/latest)
[![License: AGPL-3.0](https://img.shields.io/github/license/yossi-weinberger/ten10?style=flat&logo=gnu&logoColor=white&label=license)](https://github.com/yossi-weinberger/ten10/blob/main/LICENSE)

Ten10 is an intuitive platform designed for managing income, expenses, and the corresponding tithes (Ma'aserot) that need to be deducted. It aims to simplify household financial management for both online and offline users.

## Target Audience & Platforms

The application serves two main user groups:

1.  **Online Users**: Utilize a React web application (hosted on Vercel or similar). Data is stored and managed via Supabase, which also handles user authentication.
2.  **Offline Users**: Use a desktop version built with Tauri. Data is stored locally on the user's computer using SQLite. No internet connection or explicit authentication is required for the desktop version.

Each user is expected to use only one platform; data synchronization between web and desktop is not a current feature.

## Core Technologies

- **Language**: TypeScript
- **Frontend**: React (v18) with Vite
- **Desktop Framework**: Tauri
- **UI Components**: shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS
- **Icons**: Lucide Icons (`lucide-react`)
- **Routing**: TanStack Router (`@tanstack/react-router`)
- **State Management**: Zustand
- **Forms**: React Hook Form
- **Schema Validation**: Zod
- **Backend-as-a-Service (Web)**: Supabase
- **Local Database (Desktop)**: SQLite

## Key Features

- **Unified Transaction Model**: A single `Transaction` type for all financial events (income, expenses, donations).
- **Tithe Calculation**: Required tithe balance is calculated on the server (Supabase RPC for web, SQLite for desktop) and displayed in the dashboard; client-side calculations are available as fallback.
- **Dashboard**: Displays key metrics: income, expenses, donations, and required tithe balance.
- **Data Entry**: Intuitive forms for inputting financial transactions, including recurring transactions and category selection.
- **Data Visualization**: Interactive transactions table and charts with filtering, sorting, and export to CSV, Excel, or PDF.
- **Data Import/Export**:
  - **Desktop**: Export/Import all transaction data to/from a JSON file.
  - **Web**: Planned for future implementation.
- **Reminders & Notifications**: Web users can opt in to monthly email reminders; desktop users get system notifications and an optional autostart on login.
- **Auth & Compliance**: Terms of Service and Privacy Policy acceptance (blocking modal); password reset for web users.
- **Contact**: Contact form (web) with Supabase Edge Functions for sending and verification (e.g. CAPTCHA).
- **Multi-Language Support**: Hebrew (default) and English, with full RTL support.
- **Theming**: Light and Dark mode support.
- **Currency Support**: Multiple currencies (e.g. ILS, USD, EUR) with conversion; see `llm-instructions/features/currency/`.
- **Platform Detection**: Uses React Context to determine if running on web or desktop, allowing for platform-specific logic and UI.

## Getting Started

### Prerequisites

1.  **Node.js and npm**: Download from [nodejs.org](https://nodejs.org/).
2.  **Rust and Cargo**: Required by Tauri. Install via `rustup` from [rustup.rs](https://rustup.rs).
    - **Windows (PowerShell):** `winget install --id Rustlang.Rustup`
    - **macOS/Linux (Terminal):** `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
    - Restart your terminal after installation or configure the current shell as instructed by `rustup`.
    - Verify with `cargo --version`.

### Installation

1.  Clone the repository:
    ```bash
    git clone <your-repository-url>
    cd Ten10
    ```
2.  Install Node.js dependencies:
    ```bash
    npm install
    ```

## Running the Application

- **Development Mode (Tauri desktop app):**
  Builds frontend and backend, launches the Tauri application. Requires Rust/Cargo.
  ```bash
  npm run tauri dev
  ```
- **Development Mode (Frontend only in browser):**
  Runs the Vite development server for the frontend. Access via the URL provided (e.g., `http://localhost:5173`). Tauri backend features will not be available.
  ```bash
  npm run dev
  ```

## Building the Application

To build the production-ready application for your platform (including installer for desktop):

```bash
npm run tauri build
```

Output files will be in `src-tauri/target/release/bundle/`.

## Project Structure Overview

- `src/`: Frontend React/TypeScript source code.
  - `components/`: Reusable UI components.
  - `contexts/`: React Context providers (e.g., `PlatformContext`).
  - `lib/`: Utility functions, services (`dataService.ts`, `store.ts`), and core logic (`tithe-calculator.ts`).
  - `pages/`: Page-level components.
  - `types/`: TypeScript type definitions (e.g., `Transaction.ts`).
  - `main.tsx`: Application entry point.
  - `App.tsx`: Main application component, router setup.
- `src-tauri/`: Backend Rust/Tauri source code.
  - `src/main.rs`: Main Rust application logic, Tauri commands, SQLite interaction.
  - `tauri.conf.json`: Tauri application configuration.
  - `Ten10.db`: SQLite database file (for Desktop version, created on run).
- `public/`: Static assets.
  - `locales/`: Translation files for i18n.
- `llm-instructions/`: Detailed guides and documentation for development.
- `vite.config.ts`: Vite build configuration.
- `tailwind.config.js`: Tailwind CSS configuration.

## Data Management

### Unified Transaction Model

All financial events (income, expenses, donations) are represented by a single `Transaction` data type, detailed in `llm-instructions/features/transactions/transaction-data-model-and-calculations.md`. This model includes fields like `id`, `user_id`, `date`, `amount`, `currency`, `description`, `type`, and type-specific attributes like `isChomesh` for income.

### Data Storage

- **Web**: User data is stored in a Supabase PostgreSQL database. Row Level Security (RLS) is enforced to ensure users can only access their own data.
- **Desktop**: User data is stored in a local SQLite database (`Ten10.db`) within the `src-tauri` directory.

### State Management

Zustand (`src/lib/store.ts`) is used for global state management. The primary piece of state is the `transactions: Transaction[]` array, which holds all financial records. Key statistics and the required tithe balance are fetched from the server (Supabase RPC or Tauri/SQLite); client-side selectors such as `selectCalculatedBalance` remain available for fallback and compatibility.

### Data Flow

Data is loaded from the respective database into the Zustand store on application startup (conditional on user authentication for the web version). UI interactions manipulate the Zustand store, and changes are persisted back to the database via `dataService.ts`.

### Data Import/Export (Desktop)

The desktop application supports exporting all transaction data to a JSON file and importing data from such a file, overwriting existing data after user confirmation. This functionality is managed in `src/lib/dataManagement.ts` and accessible via the Settings page.

## Multi-Language, Theming, and Responsiveness

- **Internationalization (i18n)**: The application uses `i18next` for multi-language support, initially for Hebrew and English. Translation files are in `public/locales/`. The UI adapts to LTR/RTL directionality based on the selected language.
- **Theming**: Supports light and dark modes, managed via CSS variables and Tailwind CSS's dark mode variant.
- **Responsiveness**: Designed to be responsive across mobile, tablet, and desktop screen sizes using Tailwind CSS's responsive prefixes.

## Development Guidelines

For more detailed information on specific aspects of the project, refer to the documents in the `llm-instructions/` directory:

| Category       | Documents                                                                                                                                                                                                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Project**    | `project/project-overview-and-requirements.md`, `project/project-tech-stack-and-guidelines.md`                                                                                                                                                                                                        |
| **Platforms**  | `platforms/desktop-data-saving-guide.md`, `platforms/desktop-release-system-guide.md`, `platforms/platform-context-api-guide.md`, `platforms/tauri-v2-build-and-platform-detection-summary.md`, `platforms/android-twa-implementation-guide.md`                                                       |
| **Features**   | `features/transactions/` (data model, recurring, category selection, table overview/status), `features/email/` (reminders, unsubscribe, automated downloads), `features/auth/` (terms acceptance, password reset), `features/contact-us-feature.md`, `features/currency/currency-conversion-guide.md` |
| **Backend**    | `backend/data-flow-server-calculations-and-cleanup.md`, `backend/server-side-tithe-balance-calculation-guide.md`, `backend/supabase-integration-status.md`, `backend/supabase-edge-functions-maintenance.md`, `backend/security-hardening-jan-2026.md`                                                |
| **Deployment** | `deployment/release-management-guide.md`, `deployment/setup-updater-keys.md`, `deployment/code-signing-guide.md`, `deployment/performance-optimization-jan-2026.md`                                                                                                                                   |
| **UI**         | `ui/landing-page-complete-guide.md`, `ui/multi-language-and-responsive-design-guide.md`, `ui/ui-component-guidelines.md`, `ui/translation-map.md`, `ui/halacha-page-revamp-plan.md`                                                                                                                   |
| **Utilities**  | `utilities/logger-utility-guide.md`, `utilities/migration-guide.md`, `utilities/GOOGLE_ANALYTICS_SETUP.md`                                                                                                                                                                                            |

See `llm-instructions/project-structure.md` for the full file tree. These documents should be consulted when making changes or adding new features to ensure consistency and adherence to project standards.

## Releases and Updates

### Desktop App Auto-Updates

The desktop application supports automatic updates through GitHub Releases. Simply run:

```bash
npm run release 0.3.0
```

This will:

- Update version in all files
- Create git tag
- Trigger GitHub Actions build
- Publish release automatically

**For users**: The app checks for updates on startup, or manually via Settings > Version Info.

**Setup required** (one-time):

- Generate signing keys: See `llm-instructions/deployment/setup-updater-keys.md`
- Configure GitHub Secrets (4 required)
- See `llm-instructions/deployment/release-management-guide.md` for complete guide
- See `llm-instructions/platforms/desktop-release-system-guide.md` for detailed system documentation

## Automated Dependency Updates

This repository uses [Dependabot](https://docs.github.com/en/code-security/dependabot) to keep npm packages and GitHub Actions workflows up to date.

<!-- Triggering a new Vercel deployment -->
