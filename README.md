# Ten10: Financial Management Platform

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
- **Dynamic Tithe Calculation**: Required tithe balance is calculated dynamically in the frontend based on the transaction list.
- **Dashboard**: Displays key metrics: income, expenses, donations, and required tithe balance.
- **Data Entry**: Intuitive forms for inputting financial transactions.
- **Data Visualization**: Tables and charts with filtering and sorting options.
- **Data Import/Export**:
  - **Desktop**: Export/Import all transaction data to/from a JSON file.
  - **Web**: Planned for future implementation.
- **Multi-Language Support**: Initial support for Hebrew (default) and English.
- **Theming**: Light and Dark mode support.
- **Currency Support**: Initial support for ILS, USD, EUR.
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

All financial events (income, expenses, donations) are represented by a single `Transaction` data type, detailed in `llm-instructions/transaction-data-model-and-calculations.md`. This model includes fields like `id`, `user_id`, `date`, `amount`, `currency`, `description`, `type`, and type-specific attributes like `isChomesh` for income.

### Data Storage

- **Web**: User data is stored in a Supabase PostgreSQL database. Row Level Security (RLS) is enforced to ensure users can only access their own data.
- **Desktop**: User data is stored in a local SQLite database (`Ten10.db`) within the `src-tauri` directory.

### State Management

Zustand (`src/lib/store.ts`) is used for global state management. The primary piece of state is the `transactions: Transaction[]` array, which holds all financial records. The required tithe balance is calculated dynamically from this array using a memoized selector (`selectCalculatedBalance`).

### Data Flow

Data is loaded from the respective database into the Zustand store on application startup (conditional on user authentication for the web version). UI interactions manipulate the Zustand store, and changes are persisted back to the database via `dataService.ts`.

### Data Import/Export (Desktop)

The desktop application supports exporting all transaction data to a JSON file and importing data from such a file, overwriting existing data after user confirmation. This functionality is managed in `src/lib/dataManagement.ts` and accessible via the Settings page.

## Multi-Language, Theming, and Responsiveness

- **Internationalization (i18n)**: The application uses `i18next` for multi-language support, initially for Hebrew and English. Translation files are in `public/locales/`. The UI adapts to LTR/RTL directionality based on the selected language.
- **Theming**: Supports light and dark modes, managed via CSS variables and Tailwind CSS's dark mode variant.
- **Responsiveness**: Designed to be responsive across mobile, tablet, and desktop screen sizes using Tailwind CSS's responsive prefixes.

## Development Guidelines

For more detailed information on specific aspects of the project, refer to the documents in the `llm-instructions/` directory. These guides cover:

- Platform-specific data saving (`desktop-data-saving-guide.md`)
- Platform context API (`platform-context-api-guide.md`)
- Transaction data model and tithe calculations (`transaction-data-model-and-calculations.md`)
- Multi-language support and responsive design (`multi-language-and-responsive-design-guide.md`)
- And more...

These documents should be consulted when making changes or adding new features to ensure consistency and adherence to project standards.
