# Email Reminders Feature - Complete Implementation Guide

## Overview

This document provides a comprehensive guide to the email reminders feature implementation in the Ten10 application. The feature allows users to receive monthly email reminders about their tithe obligations, with personalized content based on their current tithe balance.

### Deployment Status

The legacy reminder pipeline is operational in production. The localized
redesign documented here is implemented and locally verified on this branch,
but it is not yet deployed production behavior. Applying the recipient RPC
migration, deploying the Edge Function and static blur asset, and completing
manual email/client verification are pending.

**Editorial Go/No-Go gate**:

- Product approver: **pending**
- Rabbinic approver: **pending**
- Approval date: **pending**
- Production rollout is **forbidden** until both approvers approve all 24
  localized encouragement items.

The content is not editorially approved merely because the implementation and
automated tests are complete.

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Architecture](#architecture)
3. [Database Schema](#database-schema)
4. [Frontend Implementation](#frontend-implementation)
5. [Backend Infrastructure](#backend-infrastructure)
6. [Email Service Setup](#email-service-setup)
7. [Edge Function Implementation](#edge-function-implementation)
8. [Testing and Deployment](#testing-and-deployment)
9. [Troubleshooting](#troubleshooting)
10. [Future Enhancements](#future-enhancements)

## Feature Overview

### Purpose

The email reminders feature sends personalized monthly reminders to users about their tithe obligations, helping them stay on track with their religious financial commitments.

### Key Features

- **Existing reminder schedule**: The frontend and Edge Function support 6 preset days (1st, 5th, 10th, 15th, 20th, 25th of each month)
- **Localized redesign (pending deployment)**: The branch implementation adds an optional first-name greeting and monthly encouragement
- **Localized copy (pending deployment)**: Subject, HTML, and plain-text bodies use Hebrew or English based on `profiles.client_preferences.language` (Hebrew fallback)
- **Direction support (pending deployment)**: Dynamic Hebrew RTL / English LTR layout
- **Platform-specific implementation**: Web users receive email reminders; desktop users receive native system notifications

### User Flow

1. User enables reminders in settings
2. User selects preferred reminder day
3. System sends email on the selected day each month
4. Email contains personalized tithe balance information

## Architecture

### High-Level Architecture

```
Frontend settings ──write preferences──▶ Supabase profiles
                                             │
                                             │ read recipients and balances
                                             ▼
Cron ──invoke with service role──▶ Reminder Edge Function ──send──▶ AWS SES
```

### Components

- **Frontend**: Settings UI for configuring reminders
- **Database**: User preferences and email addresses
- **Edge Function**: Serverless function for sending emails
- **AWS SES**: Email delivery service
- **Cron Job**: Scheduled execution

## Database Schema

### Profile Reminder Fields

The running application uses `profiles.reminder_enabled`,
`profiles.reminder_day_of_month`, `profiles.mailing_list_consent`,
`profiles.full_name`, and `profiles.client_preferences`.

The frontend and Edge Function currently support reminder days
`1, 5, 10, 15, 20, 25`. The localized-reminder feature migration in this
repository versions the recipient RPC only; it does not add or alter a
database constraint for these day values. Do not infer constraint migration
coverage from this guide.

### RPC Function for User Retrieval

A dedicated RPC function was created to efficiently retrieve users with their email addresses:

```sql
CREATE OR REPLACE FUNCTION get_reminder_users_with_emails(reminder_day INTEGER)
RETURNS TABLE (
  id UUID,
  email VARCHAR,
  reminder_enabled BOOLEAN,
  reminder_day_of_month INTEGER,
  full_name TEXT,
  language TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    u.email::varchar,
    p.reminder_enabled,
    p.reminder_day_of_month,
    p.full_name,
    CASE
      WHEN p.client_preferences->>'language' = 'en' THEN 'en'
      ELSE 'he'
    END::text AS language
  FROM public.profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.reminder_enabled = true
    AND p.reminder_day_of_month = reminder_day
    AND coalesce(p.mailing_list_consent, false) = true
    AND u.email IS NOT NULL;
END;
$$;
```

**RPC return fields**: `id`, `email`, `reminder_enabled`, `reminder_day_of_month`, `full_name`, `language`

**Language normalization**: The RPC reads `profiles.client_preferences.language`. Only `'en'` maps to English; all other values (including `NULL`) resolve to Hebrew. The Edge Function applies the same rule via `normalizeReminderLanguage()` in `email-copy.ts`.

**Access control**: Callable by `service_role` only (revoked from `anon` and `authenticated`).

## Frontend Implementation

### Settings UI Component

The reminder settings are integrated into the existing settings page:

**File**: `src/components/settings/NotificationSettingsCard.tsx`

```typescript
// Key behavior:
// - Web: toggle ON only when reminderEnabled && mailingListConsent
//   (unsubscribe may clear either column without updating client_preferences.notifications)
// - Desktop: toggle follows reminderEnabled only (local reminders ignore mailing consent)
// - Turning the toggle on/off writes both reminder_enabled and mailing_list_consent (web DB)
// - Day selector uses the same platform-specific ON state
// - Platform-specific messaging (web email vs desktop notifications)
```

**Related files**:

- `src/pages/SettingsPage.tsx` — writes only changed profile columns on toggle/day change
- `src/lib/services/preferences-sync.service.ts` — on login sync, sets local `notifications` from `reminder_enabled && mailing_list_consent`

### State Management

The reminder settings are managed through the Zustand store (`src/lib/store.ts`) as flat fields on `Settings`:

- `reminderEnabled`, `reminderDayOfMonth`, `mailingListConsent`
- `notifications` — UI/local mirror; for email, treat the dedicated columns as source of truth after sync

### Translation Support

**Files**:

- `public/locales/he/settings.json`
- `public/locales/en/settings.json`

```json
{
  "notifications": {
    "emailNotificationsDescription": "קבל עדכונים, התראות, סיכומים ותזכורות במייל", // Updated description
    // ...
  }
}
```

## Backend Infrastructure

### AWS IAM User Setup

**User**: `ten10-ses-sender`
**Policy**: `AmazonSESFullAccess`

```bash
# AWS CLI commands for setup
aws iam create-user --user-name ten10-ses-sender
aws iam attach-user-policy --user-name ten10-ses-sender --policy-arn arn:aws:iam::aws:policy/AmazonSESFullAccess
aws iam create-access-key --user-name ten10-ses-sender
```

### Supabase Secrets Configuration

**File**: Supabase project secrets

```bash
# Required secrets
supabase secrets set \
  AWS_REGION=eu-central-1 \
  AWS_ACCESS_KEY_ID=YOUR_AWS_ACCESS_KEY_ID \
  AWS_SECRET_ACCESS_KEY=YOUR_AWS_SECRET_ACCESS_KEY \
  SES_FROM=reminder-noreply@ten10-app.com \
  SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY
```

### Amazon SES Configuration

**Domain Verification**: `ten10-app.com`
**Email Verification**: `reminder-noreply@ten10-app.com`

**DNS Records**:

```
# SPF Record
TXT: v=spf1 include:amazonses.com ~all

# DKIM Records (3 CNAME records provided by SES)
CNAME: [selector1]._domainkey.ten10-app.com -> [selector1].dkim.amazonses.com
CNAME: [selector2]._domainkey.ten10-app.com -> [selector2].dkim.amazonses.com
CNAME: [selector3]._domainkey.ten10-app.com -> [selector3].dkim.amazonses.com

# DMARC Record
TXT: v=DMARC1; p=quarantine; rua=mailto:dmarc@ten10-app.com
```

## Edge Function Implementation

### Modular Architecture

The Edge Function uses a clean, modular architecture:

**File Structure** (reminder function):

```
supabase/functions/send-reminder-emails/
├── index.ts                 # Entry point, auth, Israel/Shabbat scheduling
├── user-service.ts          # RPC calls for users and tithe balances
├── reminder-user.ts         # Runtime normalization for recipient RPC rows
├── email-copy.ts            # Localized strings, 12 monthly encouragements
├── email-templates.ts       # HTML, plain-text, and subject generation
├── simple-email-service.ts  # AWS SES Raw MIME (List-Unsubscribe headers)
└── jwt-utils.ts             # Unsubscribe JWT URL generation
```

**Shared email design system** (all transactional / ops emails):

```
supabase/functions/
├── _shared/
│   ├── email-tokens.ts            # Colors, fonts, widths, header gradients, logo URL
│   ├── email-layout-user.ts       # Warm cream user shell (600px) — reminders, download
│   ├── email-layout-admin.ts      # Compact ops shell (800px, gold bar) — contact, daily summary, cron
│   ├── email-admin-primitives.ts  # Badges, table th/td, gold accent callout
│   ├── escape-html.ts             # Shared HTML escaping
│   ├── simple-email-service.ts    # AWS SES helper (also used outside reminders)
│   └── email-design.ts            # LEGACY unused — do not import; superseded by tokens/layouts
├── send-contact-email/            # Admin shell
├── send-new-user-email/           # Admin shell (daily product summary)
├── send-cron-alerts/              # Admin shell
├── process-email-request/         # User shell (download link)
└── verify-captcha/
```

**Local previews:** from repo root,
`WRITE_EMAIL_PREVIEWS=1 npm test -- supabase/functions/_tests/email-previews.test.ts`
writes HTML under `tmp/email-previews/` (gitignored). Serve that folder locally to inspect.

**Auth templates (manual):** copy HTML/subjects from
`supabase/auth-email-templates.md` into Supabase Dashboard → Authentication →
Email Templates. Not deployed by CI.

### Localization Pipeline

1. `get_reminder_users_with_emails` returns `language` from
   `client_preferences.language` (Hebrew fallback) and `default_currency`
   (ILS fallback).
2. `UserService` maps every RPC row, normalizes missing/invalid language to
   Hebrew and non-string `full_name` to `null`, then passes recipient data and
   tithe balances to `SimpleEmailService`.
3. `email-copy.ts` provides locale-specific copy and 12 monthly encouragement entries.
4. `getIsraelMonth()` selects the encouragement index using `Asia/Jerusalem`.
5. `email-templates.ts` generates localized subject, HTML, and plain text via
   `renderUserEmailShell`, formats the balance with the user's currency, and
   builds unsubscribe footer HTML.
6. `extractFirstName(full_name)` adds an optional first-name greeting.
7. `simple-email-service.ts` sends multipart MIME with `List-Unsubscribe` headers.

### Main Function (Overview)

**File**: `supabase/functions/send-reminder-emails/index.ts`

Key behaviors:

- Authorization accepts service role keys or valid JWTs; test mode requires service role.
- Day-of-month and day-of-week use `Asia/Jerusalem` (not UTC).
- Reminder days: `[1, 5, 10, 15, 20, 25]`.
- Test mode (`{"test": true}`) processes day **25** users and bypasses the day check.
- Shabbat handling: skips Friday/Saturday (Israel), with Thursday/Sunday makeup sends.
- Orchestrates `UserService` and `SimpleEmailService`; logs runs to `reminder_run_logs`.

```typescript
import { UserService } from "./user-service.ts";
import { SimpleEmailService } from "./simple-email-service.ts";

const reminderDays = [1, 5, 10, 15, 20, 25];
const finalTestDay = isTest ? 25 : effectiveDay;

const usersWithBalances =
  await userService.getUsersWithTitheBalances(finalTestDay);
const results = await emailService.sendBulkReminders(usersWithBalances);
```

### Modular Components

#### Email Copy Module

**File**: `supabase/functions/send-reminder-emails/email-copy.ts`

```typescript
export type ReminderLanguage = "he" | "en";

export function normalizeReminderLanguage(value: unknown): ReminderLanguage {
  return value === "en" ? "en" : "he";
}

export function getMonthlyEncouragement(
  language: ReminderLanguage,
  month: number,
): MonthlyEncouragement {
  return REMINDER_COPY[language].monthlyEncouragements[month - 1];
}

export function getIsraelMonth(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      month: "numeric",
    }).format(date),
  );
}
```

Each locale in `REMINDER_COPY` contains 12 `monthlyEncouragements` entries (Hebrew and English).

#### Email Templates Module

**File**: `supabase/functions/send-reminder-emails/email-templates.ts`

```typescript
import { REMINDER_COPY, getMonthlyEncouragement } from "./email-copy.ts";

export interface EmailTemplateData {
  titheBalance: number;
  language: ReminderLanguage;
  fullName?: string | null;
  israelMonth: number;
  unsubscribeUrls?: { reminderUrl: string; allUrl: string };
}

const HEADER_ASSET_URL =
  "https://ten10-app.com/email/reminder-header-blur.png";
const CREAM = "#f9f6eb";

export function extractFirstName(fullName: string | null | undefined): string | undefined {
  const firstName = fullName?.trim().split(/\s+/)[0];
  return firstName || undefined;
}

export function generateReminderEmailHTML(data: EmailTemplateData): string { /* ... */ }
export function generateReminderEmailText(data: EmailTemplateData): string { /* ... */ }
export function generateReminderEmailSubject(data: EmailTemplateData): string { /* ... */ }
```

Balance amounts use brand teal (`#11676a`) for all states — outstanding,
credit, and settled. The header uses `HEADER_ASSET_URL` with cream (`#f9f6eb`)
fallback.

#### Email Service Module

**File**: `supabase/functions/send-reminder-emails/simple-email-service.ts`

```typescript
export class SimpleEmailService {
  async sendBulkReminders(users: UserWithTitheBalance[]): Promise<EmailResult[]> {
    for (const user of users) {
      await this.sendReminderEmail(
        user.email,
        user.id,
        user.titheBalance,
        user.maaserBalance,
        user.chomeshBalance,
        user.language,
        user.full_name,
      );
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}
```

Sends Raw MIME via SES v2 with `List-Unsubscribe` and `List-Unsubscribe-Post` headers. Both plain-text and HTML parts are localized.

#### User Service Module

**File**: `supabase/functions/send-reminder-emails/user-service.ts`

```typescript
export interface ReminderUser {
  id: string;
  email: string;
  reminder_enabled: boolean;
  reminder_day_of_month: number;
  full_name: string | null;
  language: ReminderLanguage;
}

export class UserService {
  async getUsersWithTitheBalances(reminderDay: number): Promise<UserWithTitheBalance[]> {
    const users = await this.getReminderUsers(reminderDay);
    // ... calculates tithe balance per user via calculate_user_tithe_balance RPC
  }
}
```

## Testing and Deployment

### Development Workflow

Develop and verify locally first. A branch push does not satisfy the required
asset, migration, SQL verification, controlled-send, client, or editorial
gates described below.

### Manual Testing

Test mode requires a **service role** Bearer token. Anon keys cannot enable test mode.

```bash
curl -X POST "https://flpzqbvbymoluoeeeofg.supabase.co/functions/v1/send-reminder-emails" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected response (example):
{
  "message": "Processed 2 users for day 25 (TEST MODE). Sent: 2, Failed: 0",
  "results": [
    {
      "userId": "c0548835-d89a-4913-a561-4978543e8e81",
      "email": "user@example.com",
      "titheBalance": 150.00,
      "messageId": "0000014a-f4d4-4f7e-8b1a-0e8a9b2c3d4e-000000",
      "status": "sent"
    }
  ]
}
```

Test mode processes users configured for reminder day **25**.

### CI/CD Integration

- **Edge Function**: GitHub Actions deploys changed
  `supabase/functions/**` files after the branch is shipped.
- **Static asset**: The reminder header image requires the application/static
  asset deployment.
- **Database**: The recipient RPC migration must be applied through the
  repository migration workflow.
- **Manual verification**: Send tests and email-client checks remain required.

### Safe Localized-Redesign Deployment Order

Do not reorder these steps:

1. Deploy `public/email/reminder-header-blur.png`.
2. Apply the recipient RPC migration in the target non-production environment.
3. Verify the RPC return shape, normalized language values, unchanged
   consent/day filters, and function privileges (`anon = false`,
   `authenticated = false`, `service_role = true`).
4. Deploy the `send-reminder-emails` Edge Function.
5. Perform controlled Hebrew and English sends and validate unsubscribe
   behavior plus Gmail, Outlook, and Apple Mail rendering.
6. Roll out to production only after both the product and rabbinic approvers
   approve all 24 localized items and the approval date is recorded.

Migration shape/privilege verification and Gmail, Outlook, and Apple Mail
checks remain **pending**. Readiness is conditional on those checks and both
editorial approvals.

### Sender Address Notes (SES)

- Reminder emails intentionally use the global `SES_FROM` (default: `reminder-noreply@ten10-app.com`).
- Other email types should use dedicated senders to avoid accidental changes:
  - `SES_FROM_CONTACT` for contact form notifications (default: `contact-form@ten10-app.com`)
  - `SES_FROM_USERS` for the daily new-users summary (default: `users-update@ten10-app.com`)

### Cron Job Setup

**Legacy production status**: ✅ **ACTIVE**
**Localized redesign status**: ⏳ **PENDING SAFE DEPLOYMENT SEQUENCE**
**Schedule**: Daily execution at 18:00 UTC (20:00 Israel in winter / 21:00 in summer)
**Trigger**: Supabase scheduled function via pg_cron extension
**Auth**: Vault secrets `functions_base_url` + `service_role_key` (no hardcoded JWT)

```sql
-- Active pattern (see migration 20260716100000_cron_jobs_use_vault_secrets.sql)
SELECT cron.schedule(
  'send-reminder-emails',
  '0 18 * * *', -- Daily at 18:00 UTC (20:00 Israel in winter / 21:00 in summer)
  $$
    SELECT net.http_post(
      url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'functions_base_url' LIMIT 1) || '/functions/v1/send-reminder-emails',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'service_role_key' LIMIT 1)
      ),
      body := '{}'::jsonb
    );
  $$
);
```

**Job Details**:

- **Status**: Active
- **Schedule**: `0 18 * * *` (18:00 UTC daily)
- **Local Times**:
  - 🇮🇱 Israel: 20:00 (8 PM) in winter / 21:00 (9 PM) in summer
  - 🇺🇸 New York: 14:00 (2 PM) / 13:00 when EST
  - 🇬🇧 London: 19:00 (7 PM) / 18:00 when GMT

**Monitoring**:

```sql
-- Check active cron jobs
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'send-reminder-emails';

-- Check execution history
SELECT * FROM cron.job_run_details
WHERE jobname = 'send-reminder-emails'
ORDER BY start_time DESC
LIMIT 10;
```

## Troubleshooting

### Common Issues

#### 1. "No valid users found" Error

**Cause**: RPC function not finding users with reminders enabled
**Solution**:

- Verify user has `reminder_enabled = true`
- Check `reminder_day_of_month` matches current day
- Ensure user exists in both `profiles` and `auth.users` tables

#### 2. "Email address is not verified" Error

**Cause**: AWS SES Sandbox mode restrictions
**Solution**:

- Verify recipient email in AWS SES console
- Request production access from AWS
- Or use verified sender email for testing

#### 3. "Failed to parse select parameter" Error

**Cause**: Complex JOIN syntax in Supabase client
**Solution**: Use separate queries and manual data joining (implemented)

#### 4. "Check constraint violation" Error

**Cause**: Invalid `reminder_day_of_month` value
**Solution**: Confirm the deployed database accepts the six values used by
the frontend and Edge Function (`1, 5, 10, 15, 20, 25`). Any schema correction
must be implemented and reviewed as a separate database migration; this
documentation task does not add one.

### Debugging Steps

1. **Check Function Logs**:

   ```bash
   supabase functions logs send-reminder-emails
   ```

2. **Verify Database State**:

   ```sql
   SELECT id, reminder_enabled, reminder_day_of_month, email
   FROM profiles
   JOIN auth.users ON profiles.id = auth.users.id
   WHERE reminder_enabled = true;
   ```

3. **Test RPC Function**:

   ```sql
   SELECT * FROM get_reminder_users_with_emails(25);
   ```

4. **Verify Secrets**:
   ```bash
   supabase secrets list
   ```

## Future Enhancements

### Planned Features

1. **Legacy Cron Job** ✅ **ACTIVE IN PRODUCTION**

   - ✅ Daily automated execution at 18:00 UTC
   - ✅ Monitoring and alerting via pg_cron
   - ✅ Existing day-selection and Shabbat handling remain active behavior

2. **Modular Architecture** ✅ **COMPLETED**

   - ✅ Clean separation of concerns
   - ✅ Easy maintenance and development
   - ✅ Type-safe interfaces
   - ✅ Reusable components

3. **CI/CD Integration** ✅ **FUNCTION AUTOMATION AVAILABLE**

   - ✅ Automatic deployment via GitHub Actions
   - ✅ Seamless development workflow
   - ⏳ RPC migration, static asset deployment, and manual email/client checks
     remain part of the localized-redesign handoff

4. **Email Templates** ✅ **IMPLEMENTED ON BRANCH; DEPLOYMENT PENDING**

   - Hebrew and English subject, HTML, and plain-text bodies
   - 12 monthly encouragement entries per locale
   - Header asset with cream fallback
   - Optional first-name greeting from `full_name`

5. **Advanced Scheduling**

   - Custom reminder days
   - Multiple reminders per month
   - Time zone support

6. **Analytics and Reporting**

   - Email delivery statistics
   - User engagement metrics
   - A/B test results

7. **Desktop Notifications**
   - Local system notifications for desktop users
   - Cross-platform notification service

### Technical Improvements

1. **Performance Optimization**

   - ✅ Modular architecture for better performance
   - ✅ Sequential email processing with rate limiting
   - ✅ Efficient database queries with RPC functions
   - ✅ Minimal memory footprint

2. **Error Handling**

   - ✅ Comprehensive error logging
   - ✅ Error isolation per user
   - ✅ Automatic retry mechanisms
   - Dead letter queue for failed emails

3. **Security Enhancements**

   - ✅ Email content sanitization in templates
   - ✅ Rate limiting between email sends
   - ✅ Secure credential management
   - ✅ Service-role-only test mode
   - ✅ **Unsubscribe functionality** (COMPLETED — see `email-unsubscribe-system-guide.md`)
   - ✅ **List-Unsubscribe headers** via Raw MIME in `simple-email-service.ts`

4. **Monitoring and Observability**
   - ✅ Function performance metrics
   - ✅ Email delivery tracking
   - ✅ User engagement analytics
   - ✅ Cron job monitoring

## Conclusion

The legacy reminder pipeline remains operational in production. This branch
adds the maintainable localized redesign described in this guide:

- ✅ **Implemented and locally verified**: Modular copy/templates, service-role
  test mode, Hebrew/English subject/HTML/plain text, first-name greeting,
  monthly encouragement, dynamic RTL/LTR, expanded recipient RPC, and Raw MIME
  unsubscribe headers
- ⏳ **Pending**: Static blur asset deployment, database migration and SQL
  privilege verification, Edge Function deployment, controlled sends,
  Gmail/Outlook/Apple Mail checks, and both editorial approvals

The localized behavior must not be treated as production behavior until those
handoff steps complete.

### Desktop Notifications (Completed)

As a counterpart to email reminders for web users, the application now implements native system notifications for desktop users, ensuring they receive timely reminders even when working offline.

- **Technology**: The feature is built using the `@tauri-apps/plugin-notification` Tauri plugin, which allows the frontend to trigger native OS notifications.
- **Trigger**: The reminder check is initiated once the application starts (`App.tsx`), ensuring it runs each time the user launches the app. It leverages the existing platform detection (`PlatformContext`) to run exclusively on the desktop version.
- **Logic**: The core logic resides in `src/lib/data-layer/reminder.service.ts`. It reuses the user's reminder settings (day of the month, enabled status) from the Zustand store. It calculates the user's overall tithe balance and generates a notification with one of three messages (positive balance, negative balance, or zero balance), encouraging the user to update their income, expenses, and donations.
- **User Control**:
  - The same "Enable Reminders" toggle in the settings controls both email (web) and desktop notifications.
  - An "Autostart" option (`Launch at Startup`) was added to the settings for desktop users, allowing the application to launch with the system. This is recommended to ensure reminders are not missed if the user forgets to open the application.
- **Permissions**: The application will request the user's permission to show notifications on the first run. The necessary permissions (`notification:default` and `autostart:default`) are configured in `src-tauri/capabilities/migrated.json`.

### Key Benefits of the New Architecture

1. **Maintainability**: Each module has a single responsibility
2. **Scalability**: Easy to add new features and templates
3. **Developer Experience**: Clear migration, deployment, and manual
   verification handoff
4. **Type Safety**: Full TypeScript support with interfaces
5. **Performance**: Optimized database queries and email processing

**Next Phase**: Feature expansion based on user feedback and analytics, including advanced scheduling options and email template variations.

---

**Last Updated**: July 2026
**Legacy production pipeline**: ✅ **OPERATIONAL**
**Localized redesign**: ✅ **IMPLEMENTED AND LOCALLY VERIFIED; DEPLOYMENT PENDING**
**Localization**: ⏳ **HEBREW AND ENGLISH IMPLEMENTED ON BRANCH, NOT YET DEPLOYED**
**Cron Job**: Existing production cron and scheduling behavior are active at 18:00 UTC
**Handoff pending**: Static asset deploy, RPC migration and privilege checks, Edge Function deploy, controlled sends, client checks, and editorial approvals
**Desktop Notifications**: ✅ **OPERATIONAL**
**Unsubscribe System**: ✅ **FULLY IMPLEMENTED WITH ENHANCED SECURITY**
**List-Unsubscribe**: ✅ **IMPLEMENTED VIA RAW MIME**
**JWT Security**: ✅ **HARDENED - NO FALLBACK SECRETS, FULL SIGNATURE VERIFICATION**
**Next Phase**: Analytics and broader transactional-email localization
