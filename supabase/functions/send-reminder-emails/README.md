# Send Reminder Emails Function

This Edge Function sends personalized monthly reminder emails to users about their tithe obligations.

## Architecture

The function is split into multiple modules for better maintainability and follows clean architecture principles:

### 📁 File Structure

```
send-reminder-emails/
├── index.ts              # Main function entry point (minimal)
├── email-templates.ts    # Email HTML templates and subject generation
├── email-service.ts      # AWS SES integration and email sending
├── user-service.ts       # User data fetching and tithe calculations
└── README.md            # This file
```

### 🔧 Modules

#### `index.ts` - Main Function

- **Purpose**: Entry point and orchestration
- **Responsibilities**:
  - CORS handling
  - Request validation
  - Service coordination
  - Response formatting

#### `email-templates.ts` - Email Templates

- **Purpose**: Email content generation
- **Responsibilities**:
  - HTML email template
  - Subject line generation
  - RTL support for Hebrew
  - Responsive design

#### `email-service.ts` - Email Service

- **Purpose**: AWS SES integration
- **Responsibilities**:
  - SES client management
  - Email sending logic
  - Bulk email processing
  - Error handling

#### `user-service.ts` - User Service

- **Purpose**: User data operations
- **Responsibilities**:
  - Fetching reminder users
  - Tithe balance calculations
  - Database operations

## 🚀 Usage

### Development Workflow

The function integrates seamlessly with your existing development workflow:

```bash
# Development (runs with your existing tauri dev)
npm run tauri dev

# Deploy to production (automatic via GitHub Actions)
git push origin main
```

### Manual Testing

```bash
# Test the function manually
curl -X POST "https://flpzqbvbymoluoeeeofg.supabase.co/functions/v1/send-reminder-emails" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

### Cron Job

The function runs automatically daily at 18:00 UTC via pg_cron.

## 🎨 Email Template Features

- **Responsive Design**: Works on desktop and mobile
- **RTL Support**: Full Hebrew right-to-left layout
- **Personalized Content**: Dynamic tithe balance information
- **Color Coding**:
  - 🟡 Yellow: Positive balance (need to donate)
  - 🔴 Red: Negative balance (over target)
  - 🟢 Green: Exact balance (on target)

## 🔧 Configuration

### Environment Variables

- `AWS_REGION`: AWS region (default: eu-central-1)
- `AWS_ACCESS_KEY_ID`: AWS access key
- `AWS_SECRET_ACCESS_KEY`: AWS secret key
- `SES_FROM`: Sender email address
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key

### Reminder Days

Currently supports: 1, 7, 10, 15, 20 (day 7 is for testing)

## 📊 Monitoring

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

## 🛠️ Development

### Modular Development

The function is designed for easy maintenance and development:

#### Adding New Email Templates

1. **Edit** `email-templates.ts` - Add new template functions
2. **Update** `EmailTemplateData` interface if needed
3. **Use** in `email-service.ts` - No changes needed to main function

#### Modifying User Logic

1. **Edit** `user-service.ts` - Update database operations
2. **Add** new RPC functions as needed
3. **Update** interfaces for type safety

#### Changing Email Logic

1. **Edit** `email-service.ts` - Modify sending logic
2. **Update** AWS SES configuration
3. **Test** with existing templates

### Testing Changes

#### Local Development

```bash
# Run your app with Supabase functions
npm run tauri dev
```

#### Production Testing

```bash
# Deploy (automatic via GitHub Actions)
git push origin main

# Or manual deploy
supabase functions deploy send-reminder-emails
```

#### Manual Testing

```bash
# Test the deployed function
curl -X POST "https://flpzqbvbymoluoeeeofg.supabase.co/functions/v1/send-reminder-emails" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

#### Check Logs

```bash
supabase functions logs send-reminder-emails
```

## 🔒 Security

- Uses Supabase Service Role Key for database access
- AWS credentials stored as Supabase secrets
- Email content sanitization in templates
- Rate limiting between email sends (100ms delay)

## 📈 Performance

- **Modular Architecture**: Clean separation of concerns for better performance
- **Sequential Email Processing**: Avoids rate limits with 100ms delays
- **Efficient Database Queries**: Uses RPC functions for optimized data retrieval
- **Minimal Memory Footprint**: Streaming and efficient resource usage
- **Error Isolation**: One user failure doesn't stop others
- **Type Safety**: Full TypeScript support with interfaces

## 🚀 CI/CD Integration

### Automatic Deployment

The function integrates with your existing CI/CD pipeline:

- **GitHub Actions**: Automatically deploys when `supabase/functions/**` files change
- **Vercel**: Handles frontend deployment separately
- **No Manual Steps**: Everything happens automatically on `git push origin main`

### Development Workflow

```bash
# 1. Develop locally
npm run tauri dev

# 2. Make changes to email templates
# Edit: supabase/functions/send-reminder-emails/email-templates.ts

# 3. Deploy automatically
git add .
git commit -m "Update email template"
git push origin main  # GitHub Action deploys Supabase functions
```
