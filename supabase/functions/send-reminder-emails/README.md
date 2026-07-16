# Send Reminder Emails Function

The legacy reminder pipeline is operational in production. This README
describes the localized redesign implemented and locally verified on this
branch: Hebrew/English subject, HTML, and plain text; first-name greetings;
monthly encouragement; the expanded recipient RPC; and the branded header
asset.

## Deployment Status

The localized redesign is **not yet a production claim**. Before it is
production behavior, the static header asset must be deployed, the recipient
RPC migration must be applied and verified, the Edge Function must be deployed,
and controlled email/client checks must pass. Unless explicitly stated
otherwise, implementation details below describe this branch. The existing
production schedule and legacy reminder pipeline remain operational and are
not pending branch work.

### Editorial Go/No-Go Gate

- Product approver: **pending**
- Rabbinic approver: **pending**
- Approval date: **pending**
- Production rollout: **forbidden until both approvers approve all 24
  localized encouragement items**

This is an operational deployment gate. It is not a claim that the content has
already received editorial or source approval.

## Architecture

The function is split into multiple modules for maintainability and follows clean architecture principles:

### File Structure

```
send-reminder-emails/
├── index.ts                 # Main entry point, auth, scheduling, Shabbat logic
├── user-service.ts          # User data fetching and tithe calculations
├── reminder-user.ts         # Runtime normalization for recipient RPC rows
├── email-copy.ts            # Localized copy, 12 monthly encouragement entries
├── email-templates.ts       # HTML, plain-text, and subject generation
├── simple-email-service.ts  # AWS SES Raw MIME sending (List-Unsubscribe)
├── jwt-utils.ts             # Unsubscribe JWT URL generation
└── README.md                # This file
```

### Modules

#### `index.ts` — Main Function

- **Purpose**: Entry point and orchestration
- **Responsibilities**:
  - CORS handling
  - Authorization (service role required for test mode)
  - Israel timezone day-of-month and Shabbat makeup logic
  - Service coordination and run logging to `reminder_run_logs`
  - Response formatting

#### `user-service.ts` — User Service

- **Purpose**: User data operations
- **Responsibilities**:
  - Fetching reminder users via `get_reminder_users_with_emails`
  - Mapping every RPC row through runtime normalization
  - Tithe balance calculations via `calculate_user_tithe_balance`
  - Returns `full_name` and normalized `language` per user

#### `email-copy.ts` — Localized Copy

- **Purpose**: All user-facing reminder strings
- **Responsibilities**:
  - Hebrew (`he`) and English (`en`) locale objects in `REMINDER_COPY`
  - 12 monthly encouragement entries per language (rotated by Israel month)
  - `normalizeReminderLanguage()` — maps RPC `language` to `"he"` or `"en"`, defaulting to Hebrew
  - `getIsraelMonth()` — current month in `Asia/Jerusalem` for encouragement rotation

#### `email-templates.ts` — Email Templates

- **Purpose**: Email content generation
- **Responsibilities**:
  - HTML and plain-text templates
  - Subject line generation
  - First-name greeting from `full_name` via `extractFirstName()`
  - RTL/LTR layout based on locale
  - Header background image with cream (`#f9f6eb`) fallback

#### `simple-email-service.ts` — Email Service

- **Purpose**: AWS SES v2 integration via Raw MIME
- **Responsibilities**:
  - `List-Unsubscribe` and `List-Unsubscribe-Post` headers
  - Multipart alternative (plain text + HTML)
  - Bulk email processing with 100 ms delay between sends
  - Error handling per recipient

#### `jwt-utils.ts` — Unsubscribe Tokens

- **Purpose**: Signed unsubscribe URL generation
- **Responsibilities**: JWT creation for reminder-only and all-email unsubscribe links

## Localization

- **Source**: `profiles.client_preferences.language` (read by RPC `get_reminder_users_with_emails`)
- **Supported locales**: `he` (Hebrew, RTL) and `en` (English, LTR)
- **Fallback**: Any value other than `"en"` resolves to Hebrew
- **Greeting**: When `full_name` is present, the first token is used — e.g. `"Good evening, Yossi"` / `"ערב טוב, יוסי"`
- **Monthly encouragement**: One of 12 localized entries per language, selected by `getIsraelMonth()` (`Asia/Jerusalem`)
- **Plain text**: `generateReminderEmailText()` mirrors the HTML content in the user's locale

## Email Template Features

- **Responsive layout**: Table-based, max-width 600 px
- **RTL/LTR**: Dynamic `dir` and text alignment from locale
- **Header asset**: `https://ten10-app.com/email/reminder-header-blur.png` with cream (`#f9f6eb`) `bgcolor` fallback when images are blocked
- **Balance display**: All balance states (outstanding, credit, settled) use the same brand teal accent (`#11676a`) — negative balances are **not** styled red
- **Personalized content**: Dynamic tithe balance, first-name greeting, monthly encouragement

## Usage

### Development Workflow

```bash
# Development (runs with your existing tauri dev)
npm run tauri dev

# Trigger the Edge Function deployment workflow after review
git push origin main
```

### Manual Testing

Test mode bypasses the reminder-day check but **requires a service role token**. Anon keys cannot enable test mode.

```bash
curl -X POST "https://flpzqbvbymoluoeeeofg.supabase.co/functions/v1/send-reminder-emails" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

In test mode, users configured for reminder day **25** are processed.

### Cron Job

The existing production reminder cron runs daily at 18:00 UTC using a service
role Bearer from Vault secrets. It continues to invoke the legacy deployed
function until this branch's migration and Edge Function are deployed.

## Configuration

### Environment Variables

- `AWS_REGION`: AWS region (default: `eu-central-1`)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `SES_FROM`: Sender email address (default: `reminder-noreply@ten10-app.com`)
- `SES_FROM_NAME`: Optional display name
- `SES_CONFIGURATION_SET`: Optional SES configuration set
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key
- `SUPABASE_ANON_KEY`: Used for JWT validation only

### Reminder Days

The existing reminder behavior supports days **1, 5, 10, 15, 20, 25**.
Scheduling is not part of the pending localized-redesign rollout.

The function uses `Asia/Jerusalem` for day-of-month and Shabbat handling:

- Saturday (Israel): skipped entirely
- Friday (Israel): skipped (cron fires after sunset)
- Sunday: makeup for Saturday reminder days
- Thursday: makeup for Friday reminder days

## Monitoring

### Check Cron Job Status

```sql
SELECT jobid, jobname, schedule, active
FROM cron.job
WHERE jobname = 'send-reminder-emails';
```

### Check Execution History

```sql
SELECT * FROM cron.job_run_details
WHERE jobname = 'send-reminder-emails'
ORDER BY start_time DESC
LIMIT 10;
```

### Check Run Logs

```sql
SELECT * FROM reminder_run_logs
ORDER BY created_at DESC
LIMIT 10;
```

## Development

### Adding New Copy or Locales

1. Edit `email-copy.ts` — add or update strings in `REMINDER_COPY`
2. Update `email-templates.ts` if layout changes are needed
3. Add tests in `email-copy.test.ts` / `email-templates.test.ts`

### Modifying User Logic

1. Edit `user-service.ts` or the `get_reminder_users_with_emails` migration
2. Update the `ReminderUser` interface for type safety

### Changing Email Delivery

1. Edit `simple-email-service.ts` — MIME headers, SES config
2. Test with service-role test mode

### Testing Changes

#### Local Development

```bash
npm run tauri dev
```

#### Deployment and Manual Verification (Pending)

```bash
supabase functions deploy send-reminder-emails

curl -X POST "https://flpzqbvbymoluoeeeofg.supabase.co/functions/v1/send-reminder-emails" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

These commands are deployment/manual-verification instructions; they have not
yet been completed for the localized redesign on this branch.

#### Safe Deployment Order

Do not reorder these steps:

1. Deploy `public/email/reminder-header-blur.png`.
2. Apply the recipient RPC migration in the target non-production environment.
3. Verify the RPC return shape, language fallback, consent/day filters, and
   privileges (`anon = false`, `authenticated = false`, `service_role = true`).
4. Deploy the `send-reminder-emails` Edge Function.
5. Perform controlled Hebrew and English sends and validate unsubscribe
   behavior plus Gmail, Outlook, and Apple Mail rendering.
6. Roll out to production only after the product and rabbinic approvers both
   approve the 24 localized items and an approval date is recorded.

Migration shape/privilege verification and Gmail, Outlook, and Apple Mail
checks are explicitly **pending**. No staging or production deployment is
approved by local automated test results alone.

#### Check Logs

```bash
supabase functions logs send-reminder-emails
```

## Security

- Uses Supabase Service Role Key for database access
- Test mode (`{"test": true}`) is authorized only for service role keys or JWTs with `role: service_role`
- AWS credentials stored as Supabase secrets
- Email content HTML-escaped in templates
- Rate limiting between email sends (100 ms delay)
- `get_reminder_users_with_emails` is executable by `service_role` only

## Performance

- **Modular architecture**: Clean separation of concerns
- **Sequential email processing**: 100 ms delay avoids SES rate limits
- **Efficient database queries**: RPC functions for user and balance retrieval
- **Error isolation**: One user failure does not stop others
- **Type safety**: Full TypeScript with interfaces and exhaustive switches

## CI/CD Integration

- **GitHub Actions**: Deploys when `supabase/functions/**` changes
- **Manual gates remain required**: Static asset deployment, migration
  application and privilege verification, controlled sends, cross-client
  checks, and both editorial approvals must complete in the safe order above.
