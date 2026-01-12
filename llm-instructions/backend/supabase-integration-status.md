# Supabase Integration Status

This document tracks the progress of integrating Supabase into the Ten10 project (primarily for the web version).

## Completed Tasks

### Authentication

- **Project Setup:**
  - Configured Supabase client (`@supabase/supabase-js`).
  - Set up environment variables for Supabase URL and Anon Key.
  - Fixed TypeScript config for Vite env variables.
- **Authentication State Management:**
  - Created `AuthContext` with `onAuthStateChange` listener.
  - Wrapped application with `AuthProvider`.
  - **AuthContext now handles clearing the `transactions` state (Zustand) on sign-out. Data loading logic has been enhanced to be conditional (see Optimized Data Fetching below).**
- **Platform-Specific UI:**
  - Created Login (`LoginPage.tsx`) and Signup (`SignupPage.tsx`) pages, displayed only on the web platform.
  - Utilized `PlatformContext` for conditional rendering.
  - Translated forms to Hebrew.
- **Login Methods Implemented:**
  - Email/Password (`signInWithPassword`).
  - Google Sign-In (`signInWithOAuth`) - UI added, requires manual setup in dashboards.
  - Magic Link (`signInWithOtp`) - UI added, enabled by default in Supabase.
- **User Profiles & RLS:**
  - Created `public.profiles` table (`id`, `updated_at`, `full_name`, `avatar_url`, `mailing_list_consent`).
  - Established Foreign Key to `auth.users`.
  - Enabled RLS on `profiles` table.
  - Added basic RLS policies (select/insert/update own profile).
  - Added trigger to create profile on new user signup.
  - Added trigger to update `updated_at` automatically.
  - **Terms of Service Acceptance:**
    - Added columns `terms_accepted_at` (TIMESTAMPTZ) and `terms_version` (TEXT) to `profiles` table.
    - Added `terms_accepted_metadata` (JSONB) for legal audit trail (IP, User Agent, Timestamp).
    - Implemented a "Gatekeeper Modal" that forces users to accept terms on login/signup if they haven't already.
- **Signup Enhancements:**
  - Added Full Name and Mailing List Consent fields to the signup form.
  - Updated signup logic to attempt profile update if session is immediately available.
  - **Removed Checkbox:** The "I agree to Terms" checkbox was removed from the signup form in favor of the post-login Gatekeeper Modal, ensuring better UX and consistent legal coverage for Google Login users.
- **Protected Routes (Web):**
  - Implemented route protection via `beforeLoad` on the root route in `src/routes.ts`.
  - Logic correctly differentiates between web (protected) and desktop (open). Redirects unauthenticated web users to `/login`.
- **Logout:**
  - Logout button in `Sidebar.tsx` triggers `signOut` and navigates user to `/login`.
  - Logout button styled in red.
- **Manual Setup:**
  - Completed Google Sign-In setup in Google Cloud Console and Supabase Dashboard (added Client ID/Secret).
  - Verified Supabase URL Configuration (`Site URL`, `Additional Redirect URLs`) for Magic Link and OAuth.
- **State Synchronization:**
  - Transaction data fetched via `dataService` is loaded into the Zustand store (`useDonationStore`), triggered by authentication events and data freshness checks managed in `AuthContext`.
  - **Optimized Data Fetching:** Implemented conditional data loading from the database to avoid fetching on every page refresh. Data is fetched upon user login (via a `forceDbFetchOnLoad` flag in `sessionStorage`), or if existing data in Zustand is stale (e.g., older than 1 day, based on `lastDbFetchTimestamp` in Zustand). `AuthContext` manages this, including Zustand store rehydration (`_hasHydrated`). `LoginPage.tsx` and `SignupPage.tsx` set the `forceDbFetchOnLoad` flag.

### Email Notifications - New Users Summary (Daily)

- **Edge Function:** `send-new-user-email` sends a daily summary (table + text) of new users only (filtered by `auth.users.created_at`).
- **Data Source:** Uses Auth Admin API (`auth.admin.listUsers`) with a default 24h window; fetches matching `profiles` for `full_name`, `avatar_url`, `mailing_list_consent`, `reminder_enabled/day`.
- **Email Format:** Table includes Avatar/Name/Email/User ID + Date (DD/MM/YYYY) + Time (HH:MM) + Mailing consent; text body mirrors the same info. If no new users are found, returns 200 with `sent:false` and does not send an email.
- **Sender/SES:** Uses `SES_FROM_USERS` (recommended) and falls back to `users-update@ten10-app.com` by default (SES verified). This sender is intentionally isolated from the global `SES_FROM` used by reminder emails. Requires `AWS_ACCESS_KEY_ID/SECRET/REGION`.
- **Security:** Function uses Service Role Key; the cron job must use a Service Role Bearer, not anon.
- **Cron:** Daily pg_cron at `0 19 * * *` (21:00 Israel) via `net.http_post` to `/functions/v1/send-new-user-email` with Service Role authorization.

### Email Notifications - Desktop Download Requests (Email Routing)

- **Flow:** Cloudflare Email Routing → Worker → Supabase Edge Function `process-email-request` → AWS SES → user.
- **Important:** `process-email-request` must run with JWT verification disabled (Cloudflare authenticates via a shared secret header, not a Supabase JWT).
- **Repo enforcement:** `supabase/config.toml` includes:
  ```toml
  [functions.process-email-request]
  verify_jwt = false
  ```

### Database (Transactions - Web Version)

- **Project Identified:** Confirmed Supabase project `Ten10` (ID: `flpzqbvbymoluoeeeofg`).
- **`transactions` Table Created:** Added the `public.transactions` table based on the defined schema.
  - **Note on Naming Convention:** Column names in the `transactions` table in Supabase, as well as in the corresponding TypeScript `Transaction` type, now consistently use **`snake_case`** (e.g., `is_chomesh`, `created_at`, `updated_at`). This includes `id` and `user_id` which were already `snake_case`. This change was made to improve consistency and maintainability across the codebase.
  - **Primary Key:** `id` column is of type `uuid` and generated by the database (`DEFAULT gen_random_uuid()`).
- **Row Level Security (RLS) Enabled:** RLS has been activated for the `transactions` table.
- **RLS Policies Applied:** Created and verified policies (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) ensuring users can only access their own data (`USING (auth.uid() = user_id)`).
- **`updated_at` Trigger:** Configured a trigger using the shared `handle_updated_at` function to automatically update the `updated_at` column on changes (this function expects the column to be named `updated_at`).
- \*\*Service Layer Integration (`dataService.ts` and `transactionService.ts`):
  - `dataService.ts` (General Operations): Original integration for basic `loadTransactions` and `addTransaction` with the Supabase `transactions` table for the web platform. This service handles general data loading into `useDonationStore`.
  - `transactionService.ts` (Table-Specific Operations): This service (`TableTransactionsService`) is now the primary interface for the interactive transactions table when running on the web platform. It uses Supabase RPC functions for:
    - `fetchTransactions`: Calls a Supabase RPC like `get_paginated_transactions` to fetch filtered, sorted, and paginated data.
    - `updateTransaction`: Calls a Supabase RPC (e.g., `update_user_transaction`) to update a specific transaction.
    - `deleteTransaction`: Calls a Supabase RPC (e.g., `delete_user_transaction`) to delete a transaction.
    - `exportTransactions`: Calls a Supabase RPC (e.g., `export_user_transactions`) to fetch all relevant data for export, respecting filters and sorting.
  - Both services fetch user data using the Anon Key (RLS enforced) and let the database generate the `id` (UUID).
  - Data is handled consistently using `snake_case` for both TypeScript objects and database interactions.
  - **State Synchronization:**
    - General transaction data (for `useDonationStore`) is loaded via `dataService.ts` as triggered by `AuthContext`.
    - The interactive transactions table (`useTableTransactionsStore`) fetches and manages its own data subset via `transactionService.ts`.

## Known Issues & Workarounds

### Supabase Client Hangs After Refresh (Chrome/Vite/React)

- **Issue Description:** A significant issue was identified where the `@supabase/supabase-js` client becomes unresponsive to network requests (both `select` and `rpc` calls) after a page refresh when a session is restored from localStorage (`persistSession: true`). The `onAuthStateChange` event fires correctly, indicating a valid session and user, but subsequent attempts to use the client for network operations hang indefinitely without sending a request or throwing a network error. This issue primarily affects Chrome-based browsers in the Vite/React development environment.
- **Root Cause Analysis:** The problem appears to be a race condition or an internal state inconsistency within the Supabase client during the session recovery process from localStorage after a page refresh. Attempting network requests immediately within the `onAuthStateChange` callback triggers this hung state.
- **Related GitHub Issue:** This behavior is similar or identical to issues reported by other users: [https://github.com/supabase/supabase-js/issues/1401](https://github.com/supabase/supabase-js/issues/1401)
- **Workaround Implemented:** To resolve this, the data loading logic was decoupled from the `onAuthStateChange` listener in `AuthContext.tsx`:
  1.  `onAuthStateChange` now only updates the `session` and `user` state variables.
  2.  A separate `useEffect` hook was added, dependent on the `user` and `platform` state variables.
  3.  This `useEffect` initiates the data loading (`loadAndSetTransactions`) only when a valid `user` exists and the `platform` is determined.
  4.  This separation allows the Supabase client sufficient time to stabilize after session recovery before network requests are initiated, preventing the hang.
- **Impact:** This workaround successfully resolves the refresh issue and allows the application to function correctly. However, it highlights a potential instability in the current version of `@supabase/supabase-js` under these specific conditions.

## Remaining Tasks / Next Steps

### Authentication

- **Profile Management:**
  - Implement the actual Profile page (`/profile`) allowing users to view/update `full_name`, `avatar_url`, etc. (Partially done - display exists, update form needs completion).
  - Implement password update functionality on the Profile page.

### Database & Services (Web - Supabase)

- **RPC Function Implementation & Verification:** Ensure all Supabase RPC functions used by `transactionService.ts` (e.g., `get_paginated_transactions`, `update_user_transaction`, `delete_user_transaction`, `export_user_transactions`) are fully implemented, tested, and secured with appropriate RLS-aware logic within the SQL functions themselves (e.g., checking `auth.uid()`).
- **`transactionService.ts` Completeness:** Confirm that all methods in `transactionService.ts` for the web platform correctly map to and handle responses from their respective Supabase RPCs, including error handling.
- **Data Synchronization/Migration:** Define a strategy for potential data sync or migration between Desktop (SQLite) and Web (Supabase) if needed in the future.
- **Naming Convention Alignment:** Alignment to `snake_case` for the `Transaction` TypeScript type and the Supabase database schema has been completed, enhancing consistency.

### Admin Dashboard (Web Only)

- **Admin Access Control:**
  - Created `admin_emails` table with RLS for email-based whitelist access control.
  - Admin email: `<admin-email@example.com>` configured as initial admin.
  - All admin operations secured at database level - cannot be bypassed from frontend.
- **Admin RPC Functions:**
  - `get_admin_dashboard_stats()` - Returns comprehensive statistics (users, finance, downloads, engagement, system).
  - `get_admin_monthly_trends(p_start_date, p_end_date)` - Returns monthly trends with date range filtering, excludes empty months.
  - `get_earliest_system_date()` - Returns the earliest date in the system (transactions or users) for dynamic "all time" ranges.
  - All functions include admin email whitelist verification using `SECURITY DEFINER`.
- **Frontend Implementation:**
  - Route: `/admin` (web-only, protected by `beforeLoad` check).
  - Page: `src/pages/AdminDashboardPage.tsx` with tabs-based navigation.
  - Components: `src/components/admin/` directory containing:
    - `AdminUsersSection.tsx` - User statistics with StatCard components.
    - `AdminFinanceSection.tsx` - Financial overview with currency breakdown.
    - `AdminEngagementSection.tsx` - Engagement and system metrics.
    - `AdminDownloadsSection.tsx` - Desktop download tracking (placeholder).
    - `AdminTrendsChart.tsx` - Interactive charts with date range controls.
  - Service: `src/lib/data-layer/admin.service.ts` for all admin-related API calls.
  - Translations: `public/locales/{he,en}/admin.json` namespace.
- **Features:**
  - Tab-based interface: Users, Finance, Trends, Downloads.
  - Date range filtering (month, year, all time, custom) using `useDateControls` hook.
  - Interactive charts using shadcn/ui Charts (recharts).
  - Full i18n support with RTL/LTR.
  - Responsive design for all screen sizes.
  - Dark mode support.
  - Platform detection - redirects desktop users to home.
- **Security:**
  - Double protection: `beforeLoad` route guard + component-level platform check.
  - All data fetched via RPC functions with admin whitelist verification.
  - No sensitive information exposed in frontend code.
  - Cannot be accessed via F12 console or network inspection.

### General

- **Testing:** Thoroughly test all CRUD operations and RLS rules on the web platform.
- **Error Handling:** Enhance error handling and user feedback for database operations.
