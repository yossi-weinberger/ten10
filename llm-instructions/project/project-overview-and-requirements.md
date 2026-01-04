# Project Overview and Requirements

## Project Name

**Ten10**

## Goal

To create a clear and intuitive platform for managing income and the corresponding tithes (Ma'aserot) that need to be deducted. Additionally, it aims to assist with household financial management by tracking income and expenses.

## Target Audience

The audience is divided into two groups:

1.  **Online Users**: Individuals with internet access will use a React web application (likely hosted on Vercel). Data will be stored in Supabase, which will also handle authentication and user management.
2.  **Offline Users**: Individuals without internet access will use a desktop version built from the React codebase using Tauri v2. Data will be stored locally on the user's computer using SQLite. Authentication and user management are not required for these users as they work offline locally.

**Important Note**: Each user utilizes only one platform (either web or desktop). There is no need for synchronization between the two platforms.

## Data Flow

In both platforms, data is loaded from the respective database (Supabase for web, SQLite for desktop) into a global Zustand store upon application startup. All interactions within the app manipulate the Zustand store, which is then persisted back to the appropriate database.

## Platform Distinction (Web vs. Desktop)

- A context provider determines whether the application is running in a web or desktop environment.
- Most components will be shared between platforms.
- Some components will be specific to one platform (e.g., user login/profile pages are web-only).

## Core Features

- **Dashboard**: Display key metrics: income, expenses, donations (Tzedakah), and the remaining balance required for tithes.
- **Data Entry**: Allow users to input income, expenses, and donations.
- **Data Visualization**: Present data in tables and graphs with various filtering and segmentation options.
- **Data Import/Export**: Enable easy import and export of data (e.g., CSV, Excel, PDF). This is crucial for allowing users to potentially migrate between platforms or other tools.
- **Backup & Restore (Desktop Only)**: Provide functionality for users of the offline desktop version to back up their local SQLite database and restore it.

## Additional Features

- **Theme**: Light and Dark mode support.
- **Language**: Multi-language support (starting with Hebrew and English), with full Right-to-Left (RTL) layout support for Hebrew. Default to Hebrew initially.
- **Currency**: Multi-currency support (starting with ILS, USD, EUR).
- **Calendar**: Support for Gregorian and Hebrew calendars.

## Pages / Views

- Main Dashboard
- Income / Expenses / Donations Page (likely combined or separate views)
- Halachot (Jewish Law) Information Page
- About Page
- Settings Page
- User Profile Page (Web only)

## Data Types and Tithe Calculations

The application needs to handle various types of financial entries, each affecting the tithe calculation differently:

- **Regular Income (e.g., Salary)**: 10% (Ma'aser) or 20% (Chomesh, if selected by the user) is added to the required tithe amount.
- **Tithe-Exempt Income (e.g., Travel Expenses)**: Does not affect the tithe calculation.
- **Donations/Tzedakah**: 100% of the amount is deducted from the required tithe amount.
- **Regular Expenses**: Do not affect the tithe calculation.
- **Special Expenses (Permitted Tithe Deductions)**: Expenses for spiritual matters that are permissible to be paid from tithe funds. These reduce the required tithe amount.

**Planned DB Structure & Calculation Approach:**

- A single `transactions` table will be used in both SQLite (Desktop) and Supabase (Web). This table will store all types of financial events (income, donations, expenses, etc.) distinguished by a `type` column.
- The required tithe balance, as well as other key statistics like total income, total expenses, and total donations (within a given date range or overall), are primarily calculated on the server-side:
  - **Web (Supabase):** SQL functions (e.g., `calculate_user_tithe_balance`, `get_total_income_and_chomesh_for_user`, `get_total_expenses_for_user`, `get_total_donations_for_user`) are invoked via RPC calls from the frontend.
  - **Desktop (Tauri/SQLite):** Rust commands (e.g., `get_desktop_overall_tithe_balance`, `get_desktop_total_income_in_range`, `get_desktop_total_expenses_in_range`, `get_desktop_total_donations_in_range`) execute SQL queries directly against the local SQLite database.
- These server-calculated values are then fetched and displayed in the frontend. Client-side calculations from the full transaction list are currently maintained for comparison and as a fallback but are planned to be phased out. (Refer to `../features/transactions/transaction-data-model-and-calculations.md` and `../backend/data-flow-server-calculations-and-cleanup.md` for technical details).
- **Status:** This unified model with server-side calculations for key statistics and tithe balance has been implemented for both the **Desktop (SQLite) version** and the **Web (Supabase) version**. Frontend components display these server-calculated values, often alongside client-calculated counterparts for verification during the transition.

### Reminders & Notifications

- **Requirement**: The application should provide reminders to users.
- **Status (Web)**: Implemented. Web users can opt-in to receive monthly email reminders. The content is personalized based on their current tithe balance. This is handled by a Supabase Edge Function triggered by a daily cron job.
- **Status (Desktop)**: Implemented. Desktop users can receive native system notifications. The logic is triggered on application startup and uses the same user settings as the web version. To ensure timely reminders, an "Autostart" option is provided in the settings, allowing the application to launch on system startup.

### Terms of Service Acceptance

- **Requirement**: Users must explicitly accept the Terms of Service and Privacy Policy before using the application.
- **Status**: ✅ Implemented.
  - **Blocking Modal**: A non-dismissible modal appears after authentication (web) or on app launch (desktop) if terms haven't been accepted.
  - **Version Tracking**: The system tracks which version of terms the user accepted, allowing re-prompting when terms are updated.
  - **Metadata Collection**: Captures local time, timezone, user agent, and platform for legal compliance.
  - **Platform-Specific Storage**:
    - **Web**: Stored in Supabase `profiles` table (`terms_accepted_at`, `terms_version`, `terms_accepted_metadata`)
    - **Desktop**: Stored locally in Zustand store (`settings.termsAcceptedVersion`)
- **Implementation Details**: `../features/auth/terms-acceptance.md`

### Desktop Updates & Distribution

- **Requirement**: Desktop users (who are offline) need a way to receive new versions and updates.
- **Solution**: Automated release system with GitHub Releases and auto-updater.
- **Status**: ✅ Fully Implemented.
  - **Auto-Update System**: Uses Tauri updater plugin to check GitHub Releases for new versions and install them automatically.
  - **GitHub Actions**: Automated workflow that builds, signs, and publishes releases when a version tag is pushed.
  - **Manual Check**: Users can manually check for updates via Settings > Version Info > "Check for Updates" button.
  - **Landing Page**: Dynamic download links pull latest version from GitHub Releases API.
  - **One-Command Release**: `npm run release 0.3.0` handles entire release process automatically.
- **Implementation Details**:
  - **Quick Start**: `../deployment/setup-updater-keys.md` - First-time setup
  - **Complete Guide**: `../platforms/desktop-release-system-guide.md` - Full system overview
  - **Technical Details**: `../deployment/release-management-guide.md` - Detailed troubleshooting and process

## Future Features (Low Priority)

- **Advanced Reporting**: Annual summaries, period comparisons, custom expense categories.
- **Budgeting Tools**: Define and track budgets for expense categories.
- **Goal Management**: Set and track savings or donation goals.
- **Advanced Halachic Calculations**: Handle more complex scenarios (consultation required).
- **Direct Data Import**: Import from bank/credit card statements (CSV/Excel).

## Data Management Features

### Data Import/Export

- **Requirement**: Users should be able to export all their transaction data to a local file and import data from such a file. This facilitates data backup, migration between platforms (desktop/web), and data recovery.
- **Status (Desktop - Phase 1)**:
  - **Export**: Implemented. Users can export all transactions to a JSON file.
  - **Import**: Implemented. Users can import transactions from a JSON file, which will overwrite existing data after user confirmation.
  - **Logic Location**: Core import/export logic for desktop is located in `src/lib/data-layer/dataManagement.service.ts`, invoked from `src/pages/SettingsPage.tsx`.
- **Status (Web)**: Not yet implemented.
- **Format**: JSON, based on the unified `Transaction` data model.
- **Pending/Future Improvements**:
  - Robust data validation (e.g., using Zod schemas) during import to prevent data corruption.
  - Option for data merging instead of complete overwrite during import (more complex).
  - Implementation of import/export functionality for the web platform (Supabase).
  - Enhanced UI for confirmation dialogs (e.g., using `shadcn/ui` components instead of `window.confirm`).

## Future Enhancements / Nice-to-Haves

- **User Interface (UI):** Intuitive, clean, and modern, with support for light and dark modes.
- **Display Components:**
  - **Dashboard:** Display key financial summaries (required tithe balance, total income, total expenses, total donations) using statistics cards (`StatsCards`) and a monthly chart (`MonthlyChart`).
  - **Interactive Transactions Table:** A central component for displaying, managing, and analyzing all financial transactions. Supports advanced filtering (free text search, date range, transaction types), dynamic sorting by columns, pagination ("Load More"), editing and deleting transactions directly from the table, and exporting the displayed data (after filtering and sorting) to CSV, Excel, and PDF formats.
  - **Forms:** Clear and user-friendly forms for adding and editing transactions (`TransactionForm`, `TransactionEditModal`).
- **Backend Services:**
  - **Create, Read, Update, Delete (CRUD) of transactions:** The user will be able to add, view, edit, and delete financial transactions.
  - **Filtering and Sorting Transactions:** The user will be able to filter transactions by various criteria (such as date range, transaction type, free text search) and sort them by different columns (such as date, amount, description).
  - **Pagination:** The user will be able to load additional data in long tables using a "Load More" button.
  - **Tithe Balance Calculation:** The system will automatically calculate the required tithe balance based on the entered transactions.
  - **Data Export:** The user will be able to export the list of transactions (including filtered transactions displayed in the table) to common formats like CSV, Excel, and PDF.
  - **Backup and Restore (Desktop):** The user will be able to back up and restore the local database.
  - **User Settings:** The user will be able to customize various settings, such as currency and language preferences.
