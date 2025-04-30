# Project Overview and Requirements

## Project Name

**Ten10**

## Goal

To create a clear and intuitive platform for managing income and the corresponding tithes (Ma'aserot) that need to be deducted. Additionally, it aims to assist with household financial management by tracking income and expenses.

## Target Audience

The audience is divided into two groups:

1.  **Online Users**: Individuals with internet access will use a React web application (likely hosted on Vercel). Data will be stored in Supabase, which will also handle authentication and user management.
2.  **Offline Users**: Individuals without internet access will use a desktop version built from the React codebase using Tauri. Data will be stored locally on the user's computer using SQLite. Authentication and user management are not required for these users as they work offline locally.

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
- **Language**: Multi-language support (starting with Hebrew and English). Default to Hebrew initially.
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
- The required tithe balance is not stored in the database. It will be calculated dynamically in the frontend based on the full list of transactions retrieved from the database. (Refer to `llm-instructions/transaction-data-model-and-calculations.md` for technical details).
- **Status:** This unified model and dynamic calculation approach has been fully implemented for the **Desktop (SQLite) version**, including refactoring of the dashboard, data entry form, transaction table, and export functionalities to utilize this model. Web (Supabase) version implementation is pending.

## Future Features (Low Priority)

- **Reminders & Notifications**: e.g., for tithing, bill payments, budget limits.
- **Advanced Reporting**: Annual summaries, period comparisons, custom expense categories.
- **Budgeting Tools**: Define and track budgets for expense categories.
- **Goal Management**: Set and track savings or donation goals.
- **Advanced Halachic Calculations**: Handle more complex scenarios (consultation required).
- **Direct Data Import**: Import from bank/credit card statements (CSV/Excel).
