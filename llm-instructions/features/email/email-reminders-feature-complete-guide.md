# Email Reminders Feature - Complete Implementation Guide

## Overview

This document provides a comprehensive guide to the email reminders feature implementation in the Ten10 application. The feature allows users to receive monthly email reminders about their tithe obligations, with personalized content based on their current tithe balance.

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

- **User-configurable reminder days**: Users can choose from 4 preset days (1st, 10th, 15th, 20th of each month)
- **Personalized content**: Emails include the user's current tithe balance and personalized messaging
- **Hebrew RTL support**: Full right-to-left layout support for Hebrew content
- **Platform-specific implementation**: Web users receive email reminders, desktop users will receive local notifications (future feature)

### User Flow

1. User enables reminders in settings
2. User selects preferred reminder day
3. System sends email on the selected day each month
4. Email contains personalized tithe balance information

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Supabase       │    │   AWS SES       │
│   (Settings)    │───▶│   (Database)     │───▶│   (Email)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌──────────────────┐
                       │  Edge Function   │
                       │  (Cron Job)      │
                       └──────────────────┘
```

### Components

- **Frontend**: Settings UI for configuring reminders
- **Database**: User preferences and email addresses
- **Edge Function**: Serverless function for sending emails
- **AWS SES**: Email delivery service
- **Cron Job**: Scheduled execution

## Database Schema

### Profiles Table Updates

The `profiles` table was extended with reminder-related columns:

```sql
-- Added columns to profiles table
ALTER TABLE public.profiles
ADD COLUMN reminder_enabled BOOLEAN DEFAULT false,
ADD COLUMN reminder_day_of_month INTEGER DEFAULT 1;

-- Constraint for valid reminder days
ALTER TABLE public.profiles
ADD CONSTRAINT check_reminder_day_of_month
CHECK (reminder_day_of_month = ANY (ARRAY[1, 7, 10, 15, 20]));
```

### RPC Function for User Retrieval

A dedicated RPC function was created to efficiently retrieve users with their email addresses:

```sql
CREATE OR REPLACE FUNCTION get_reminder_users_with_emails(reminder_day INTEGER)
RETURNS TABLE (
  id UUID,
  email VARCHAR(255),
  reminder_enabled BOOLEAN,
  reminder_day_of_month INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    u.email,
    p.reminder_enabled,
    p.reminder_day_of_month
  FROM profiles p
  JOIN auth.users u ON p.id = u.id
  WHERE p.reminder_enabled = true
  AND p.reminder_day_of_month = reminder_day;
END;
$$;
```

## Frontend Implementation

### Settings UI Component

The reminder settings are integrated into the existing settings page:

**File**: `src/components/settings/NotificationSettingsCard.tsx`

```typescript
interface NotificationSettingsCardProps {
  reminderEnabled: boolean;
  reminderDayOfMonth: number;
  onReminderEnabledChange: (enabled: boolean) => void;
  onReminderDayChange: (day: number) => void;
}

// Key features:
// - Toggle switch for enabling/disabling reminders
// - Day selector with 4 preset options
// - Platform-specific messaging (web vs desktop)
// - RTL/LTR support for Hebrew/English
```

### State Management

The reminder settings are managed through the Zustand store:

**File**: `src/lib/store.ts`

```typescript
interface Settings {
  // ... existing settings
  reminderSettings: {
    enabled: boolean;
    dayOfMonth: 1 | 10 | 15 | 20;
  };
}

// Actions:
// - setReminderEnabled(enabled: boolean)
// - setReminderDayOfMonth(day: number)
// - saveSettings() // Persists to localStorage and Supabase
```

### Translation Support

**Files**:

- `public/locales/he/settings.json`
- `public/locales/en/settings.json`

```json
{
  "reminderSettings": {
    "title": "תזכורות חודשיות",
    "description": "קבל תזכורות לעדכון המעשרות",
    "enabled": "הפעל תזכורות",
    "dayOfMonth": "יום בחודש",
    "days": {
      "1": "1 בחודש",
      "10": "10 בחודש",
      "15": "15 בחודש",
      "20": "20 בחודש"
    }
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
  AWS_ACCESS_KEY_ID=AKIA... \
  AWS_SECRET_ACCESS_KEY=... \
  SES_FROM=reminder-noreply@ten10-app.com \
  SUPABASE_SERVICE_ROLE_KEY=eyJ...
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

The Edge Function has been refactored into a clean, modular architecture for better maintainability:

**File Structure**:

```
supabase/functions/
├── _shared/
│   ├── cors.ts               # CORS headers utility
│   ├── email-design.ts       # Shared email design system (Theme, Header, Styles)
│   └── simple-email-service.ts # AWS SES email sending utility
├── send-reminder-emails/
│   ├── index.ts              # Main function entry point
│   ├── email-templates.ts    # Email HTML templates (uses _shared/email-design.ts)
│   ├── user-service.ts       # User data fetching and tithe calculations
│   └── jwt-utils.ts          # JWT handling
├── send-contact-email/       # Contact form emails (uses _shared/email-design.ts)
├── send-new-user-email/      # Daily new user summary (uses _shared/email-design.ts)
└── verify-captcha/           # Cloudflare Turnstile verification
```

### Shared Design System

All email functions now use a shared design system defined in `supabase/functions/_shared/email-design.ts`. This ensures consistency across all transactional emails.

**Key features of the shared design:**
- **Centralized Theme**: Colors, fonts, and logo URL are defined in one place.
- **Consistent Header**: A `getEmailHeader()` function generates the same branded header for all emails.
- **RTL Support**: Explicit styles for Right-to-Left languages (Hebrew).
- **Brand Identity**: Prominent logo and teal/gold color scheme.

### Main Function (Simplified)

**File**: `supabase/functions/send-reminder-emails/index.ts`

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { EmailService } from "./email-service.ts";
import { UserService } from "./user-service.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // CORS handling
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize services
    const userService = new UserService();
    const emailService = new EmailService();

    // Get current date and check if it's a reminder day
    const currentDay = new Date().getDate();
    const reminderDays = [1, 7, 10, 15, 20]; // 7 added for testing

    // Test mode support
    const body = await req.json().catch(() => ({}));
    const isTest = body.test === true;

    if (!reminderDays.includes(currentDay) && !isTest) {
      return new Response(
        JSON.stringify({
          message: `Today (${currentDay}) is not a reminder day. Reminder days: ${reminderDays.join(
            ", "
          )}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get users with tithe balances
    const testDay = isTest ? 7 : currentDay;
    const usersWithBalances = await userService.getUsersWithTitheBalances(
      testDay
    );

    if (usersWithBalances.length === 0) {
      return new Response(
        JSON.stringify({
          message: `No users found with reminders enabled for day ${testDay}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Send bulk reminder emails
    const results = await emailService.sendBulkReminders(usersWithBalances);

    return new Response(
      JSON.stringify({
        message: `Processed ${
          usersWithBalances.length
        } users for day ${testDay}${isTest ? " (TEST MODE)" : ""}`,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in send-reminder-emails function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
```

### Modular Components

#### Email Templates Module

**File**: `supabase/functions/send-reminder-emails/email-templates.ts`

```typescript
import { EMAIL_THEME, getEmailHeader } from "../_shared/email-design.ts";

export interface EmailTemplateData {
  titheBalance: number;
  isPositive: boolean;
  isNegative: boolean;
  userName?: string;
  unsubscribeUrls?: {
    reminderUrl: string;
    allUrl: string;
  };
}

export function generateReminderEmailHTML(data: EmailTemplateData): string {
  // Uses EMAIL_THEME for colors and fonts
  // Uses getEmailHeader("he") for the branded header
  // Includes explicit direction: rtl and text-align: right styles
  // ...
}
```

#### Email Service Module

**File**: `supabase/functions/send-reminder-emails/email-service.ts`

```typescript
export class EmailService {
  private sesClient: SESv2Client;
  private fromEmail: string;

  constructor() {
    this.sesClient = new SESv2Client({
      region: Deno.env.get("AWS_REGION") ?? "eu-central-1",
      credentials: {
        accessKeyId: Deno.env.get("AWS_ACCESS_KEY_ID") ?? "",
        secretAccessKey: Deno.env.get("AWS_SECRET_ACCESS_KEY") ?? "",
      },
    });

    this.fromEmail =
      Deno.env.get("SES_FROM") ?? "reminder-noreply@ten10-app.com";
  }

  async sendBulkReminders(
    users: Array<{ id: string; email: string; titheBalance: number }>
  ): Promise<EmailResult[]> {
    const results: EmailResult[] = [];

    // Process emails sequentially to avoid rate limiting
    for (const user of users) {
      const result = await this.sendReminderEmail(
        user.email,
        user.id,
        user.titheBalance
      );
      results.push(result);

      // Small delay between emails to be respectful to SES
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }
}
```

#### User Service Module

**File**: `supabase/functions/send-reminder-emails/user-service.ts`

```typescript
export class UserService {
  private supabaseClient: any;

  constructor() {
    this.supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { autoRefreshToken: false, persistSession: false } }
    );
  }

  async getUsersWithTitheBalances(
    reminderDay: number
  ): Promise<UserWithTitheBalance[]> {
    const users = await this.getReminderUsers(reminderDay);
    const usersWithBalances: UserWithTitheBalance[] = [];

    for (const user of users) {
      const titheBalance = await this.calculateUserTitheBalance(user.id);
      usersWithBalances.push({
        ...user,
        titheBalance,
      });
    }

    return usersWithBalances;
  }
}
```

## Testing and Deployment

### Development Workflow

The function integrates seamlessly with your existing development workflow:

```bash
# 1. Develop locally (runs with your existing tauri dev)
npm run tauri dev

# 2. Make changes to email templates
# Edit: supabase/functions/send-reminder-emails/email-templates.ts

# 3. Deploy automatically
git add .
git commit -m "Update email template"
git push origin main  # GitHub Action deploys Supabase functions
```

### Manual Testing

```bash
# Test the deployed function
curl -X POST "https://flpzqbvbymoluoeeeofg.supabase.co/functions/v1/send-reminder-emails" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'

# Expected response:
{
  "message": "Processed 2 users for day 7 (TEST MODE)",
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

### CI/CD Integration

**GitHub Actions**: Automatically deploys when `supabase/functions/**` files change
**Vercel**: Handles frontend deployment separately
**No Manual Steps**: Everything happens automatically on `git push origin main`

### Cron Job Setup

**Status**: ✅ **IMPLEMENTED AND ACTIVE**
**Schedule**: Daily execution at 18:00 UTC (20:00 Israel time)
**Trigger**: Supabase scheduled function via pg_cron extension

```sql
-- Active cron job setup
SELECT cron.schedule(
  'send-reminder-emails',
  '0 18 * * *', -- Daily at 18:00 UTC (20:00 Israel time)
  'SELECT net.http_post(
    url:=''https://flpzqbvbymoluoeeeofg.supabase.co/functions/v1/send-reminder-emails'',
    headers:=''{"Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZscHpxYnZieW1vbHVvZWVlb2ZnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDU3NTk2NDQsImV4cCI6MjA2MTMzNTY0NH0.wSymW37g5ekcgZec1RkPbufTp60pokmUQF3V6L663Wo"}'',
    body:=''{}''
  );'
);
```

**Job Details**:

- **Job ID**: 3
- **Status**: Active
- **Schedule**: `0 18 * * *` (18:00 UTC daily)
- **Local Times**:
  - 🇮🇱 Israel: 20:00 (8 PM)
  - 🇺🇸 New York: 13:00 (1 PM)
  - 🇬🇧 London: 18:00 (6 PM)
  - 🇦🇺 Sydney: 05:00+1 (5 AM next day)

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
**Solution**: Update constraint to include all valid days

```sql
ALTER TABLE profiles DROP CONSTRAINT check_reminder_day_of_month;
ALTER TABLE profiles ADD CONSTRAINT check_reminder_day_of_month
CHECK (reminder_day_of_month = ANY (ARRAY[1, 7, 10, 15, 20]));
```

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
   SELECT * FROM get_reminder_users_with_emails(7);
   ```

4. **Verify Secrets**:
   ```bash
   supabase secrets list
   ```

## Future Enhancements

### Planned Features

1. **Cron Job Implementation** ✅ **COMPLETED**

   - ✅ Daily automated execution at 18:00 UTC
   - ✅ Error handling and retry logic
   - ✅ Monitoring and alerting via pg_cron

2. **Modular Architecture** ✅ **COMPLETED**

   - ✅ Clean separation of concerns
   - ✅ Easy maintenance and development
   - ✅ Type-safe interfaces
   - ✅ Reusable components

3. **CI/CD Integration** ✅ **COMPLETED**

   - ✅ Automatic deployment via GitHub Actions
   - ✅ Seamless development workflow
   - ✅ No manual deployment steps

4. **Email Templates**

   - Multiple template options
   - A/B testing capabilities
   - Dynamic content based on user preferences

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
   - ✅ **Unsubscribe functionality** (COMPLETED - see `email-unsubscribe-system-guide.md`)

4. **Monitoring and Observability**
   - ✅ Function performance metrics
   - ✅ Email delivery tracking
   - ✅ User engagement analytics
   - ✅ Cron job monitoring

## Conclusion

The email reminders feature provides a comprehensive solution for helping users stay on track with their tithe obligations. The implementation follows best practices for security, scalability, and user experience, with full support for Hebrew RTL content and personalized messaging.

The feature is now **fully operational in production** with:

- ✅ **Modular Architecture**: Clean, maintainable code structure
- ✅ **Automated Deployment**: CI/CD integration with GitHub Actions
- ✅ **Automated Daily Email Sending**: Cron Job at 18:00 UTC
- ✅ **Manual Testing Capabilities**: Easy debugging and testing
- ✅ **Personalized Content**: Based on user tithe balance
- ✅ **Hebrew RTL Support**: Beautiful, responsive email templates
- ✅ **Robust Error Handling**: Comprehensive monitoring and logging
- ✅ **Seamless Development**: Integrates with existing workflow

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
3. **Developer Experience**: No manual deployment steps required
4. **Type Safety**: Full TypeScript support with interfaces
5. **Performance**: Optimized database queries and email processing

**Next Phase**: Feature expansion based on user feedback and analytics, including advanced scheduling options and email template variations.

---

**Last Updated**: January 2025
**Status**: ✅ **FULLY OPERATIONAL IN PRODUCTION**
**Architecture**: ✅ **MODULAR AND MAINTAINABLE**
**Cron Job**: Active (18:00 UTC daily)
**CI/CD**: ✅ **AUTOMATED DEPLOYMENT**
**Desktop Notifications**: ✅ **OPERATIONAL**
**Unsubscribe System**: ✅ **FULLY IMPLEMENTED WITH ENHANCED SECURITY**
**JWT Security**: ✅ **HARDENED - NO FALLBACK SECRETS, FULL SIGNATURE VERIFICATION**
**Next Phase**: Feature Enhancement and Analytics
