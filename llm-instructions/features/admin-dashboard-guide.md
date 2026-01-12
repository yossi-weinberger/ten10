# Admin Dashboard Feature Guide

## Overview

The Admin Dashboard is a secure, web-only feature that provides comprehensive statistics and insights about the Ten10 system. Access is restricted to whitelisted admin email addresses through database-level security.

## Security Architecture

### Email Whitelist System

**Database Table: `admin_emails`**

```sql
CREATE TABLE admin_emails (
  email TEXT PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  notes TEXT
);
```

**RLS Policies:**

- Only admins can view the admin_emails table
- Only admins can insert/delete admin emails
- Initial admin: `<admin-email@example.com>`

### Security Layers

1. **Route Protection (`src/routes.ts`):**

   - `beforeLoad` check prevents desktop platform access
   - `beforeLoad` verifies admin privileges via RPC call
   - Automatic redirect to home for non-admin users

2. **Component Protection (`AdminDashboardPage.tsx`):**

   - Platform check with `usePlatform()` hook
   - Redirects desktop users
   - Only renders on web platform

3. **Database Protection (RPC Functions):**
   - All admin RPC functions use `SECURITY DEFINER`
   - Email whitelist verification in every function via `is_admin_user()` helper
   - Raises exception if user is not authenticated or not in whitelist
   - Monitoring functions (`get_active_connections`, `get_slow_queries`, `get_table_stats`, `get_tables_without_rls`, `get_missing_indexes`) include admin checks at SQL level
   - Functions skip admin check when called by `service_role` (Edge Function context)

**Security guarantees:**

- ✅ Cannot be bypassed via F12 console
- ✅ Cannot be accessed from desktop version
- ✅ No sensitive information exposed in frontend
- ✅ All checks performed at database level

## Backend (Supabase)

### RPC Functions

#### 1. `get_admin_dashboard_stats()`

Returns comprehensive dashboard statistics.

**Returns:**

```typescript
{
  users: {
    total: number;
    active_30d: number;
    new_30d: number;
    new_7d: number;
  }
  finance: {
    total_income: number;
    total_expenses: number;
    total_donations: number;
    total_recognized_expenses: number;
    total_exempt_income: number;
    total_non_tithe_donation: number;
    by_currency: Record<
      string,
      {
        income: number;
        expenses: number;
        donations: number;
        total_managed: number;
      }
    >;
  }
  downloads: {
    total: number;
    last_30d: number;
    by_platform: Record<string, number>;
  }
  engagement: {
    avg_transactions_per_user: number;
    total_transactions: number;
    users_with_transactions: number;
  }
  system: {
    total_recurring_transactions: number;
    active_recurring_transactions: number;
  }
}
```

#### 2. `get_admin_monthly_trends(p_start_date, p_end_date)`

Returns monthly trends filtered by date range.

**Parameters:**

- `p_start_date` (DATE, optional): Start date, defaults to 12 months ago
- `p_end_date` (DATE, optional): End date, defaults to today

**Returns:**

```typescript
Array<{
  month: string; // YYYY-MM format
  new_users: number;
  total_income: number;
  total_expenses: number;
  total_donations: number;
  transaction_count: number;
  active_users: number;
}>;
```

**Note:** Only returns months with actual data (filters out empty months).

#### 3. `get_earliest_system_date()`

Returns the earliest date in the system for dynamic "all time" ranges.

**Returns:**

```typescript
{
  earliest_date: string; // YYYY-MM-DD
  earliest_transaction: string;
  earliest_user: string;
}
```

## Frontend

### File Structure

```
src/
├── pages/
│   └── AdminDashboardPage.tsx          # Main admin dashboard page
├── components/
│   └── admin/
│       ├── AdminUsersSection.tsx       # User statistics
│       ├── AdminFinanceSection.tsx     # Financial overview
│       ├── AdminEngagementSection.tsx  # Engagement metrics
│       ├── AdminDownloadsSection.tsx   # Download tracking (placeholder)
│       ├── AdminTrendsChart.tsx        # Interactive charts
│       ├── AdminMonitoringSection.tsx  # System monitoring main component
│       └── monitoring/                 # Monitoring components (organized)
│           ├── AdminMonitoringComponents.tsx  # Shared components (StatusIcon, ServiceHealthCard, etc.)
│           ├── monitoringUtils.ts      # Shared utilities (getTooltipDescriptions)
│           └── stats/                  # Individual stats components
│               ├── DatabaseStats.tsx   # Database statistics display
│               ├── AuthStats.tsx       # Authentication statistics display
│               ├── EdgeFunctionStats.tsx  # Edge Functions statistics display
│               ├── EmailStatsDisplay.tsx  # Email (SES) statistics display
│               ├── CloudflareStatsDisplay.tsx  # Cloudflare statistics display
│               ├── VercelStatsDisplay.tsx  # Vercel statistics display
│               └── index.ts           # Re-exports all stats components
├── lib/
│   └── data-layer/
│       ├── admin.service.ts            # Admin API service
│       ├── monitoring.service.ts       # Monitoring API service functions
│       └── monitoring.types.ts         # Monitoring TypeScript types/interfaces
└── routes.ts                           # Route definition with protection

supabase/
├── functions/
│   └── get-monitoring-data/
│       └── index.ts                    # Monitoring Edge Function (NEW)
└── migrations/
    └── 20260112_add_monitoring_functions.sql  # PostgreSQL RPC functions (NEW)
```

### Components

#### AdminDashboardPage

Main page with tab-based navigation.

**Tabs:**

1. **Users** - User statistics + engagement + system info
2. **Finance** - Financial overview with currency breakdown
3. **Trends** - Interactive charts with date range controls
4. **Downloads** - Desktop download tracking (placeholder)
5. **Monitoring** - System health monitoring and observability

**Features:**

- Platform detection and redirect
- Loading states with skeletons
- Error handling with alerts
- Full i18n support (admin namespace)
- Responsive design

#### AdminUsersSection

Displays user statistics using StatCard components.

**Metrics:**

- Total users
- Active users (30 days) with percentage
- New users (30 days)
- New users (7 days)

**Color schemes:** purple, green, blue, orange

#### AdminFinanceSection

Financial overview with highlighted total and breakdown.

**Features:**

- Large centered "Total Managed" card
- Three main categories (Income, Expenses, Donations)
- Shows exceptions as subtitles (exempt income, recognized expenses, non-tithe donations)
- Currency breakdown sorted by: ILS, USD, then alphabetically

**Color schemes:** green (income), red (expenses), yellow (donations)

#### AdminEngagementSection

Engagement and system metrics.

**Metrics:**

- Average transactions per user
- Total transactions
- Users with transactions
- Total recurring transactions
- Active recurring transactions

#### AdminDownloadsSection

Placeholder for download tracking.

**Note:** Currently returns placeholder data (0). Can be implemented in the future with:

#### AdminMonitoringSection

Real-time system health monitoring dashboard.

**File Structure:**

The monitoring section is organized into multiple files for better maintainability:

- **`AdminMonitoringSection.tsx`** - Main component that orchestrates all monitoring displays
- **`monitoring/AdminMonitoringComponents.tsx`** - Shared UI components:
  - `MetricWithTooltip` - Metric display with help tooltip
  - `StatusIcon` - Status indicator icon component
  - `ServiceHealthCard` - Health status card for services
  - `AnomalyList` - List display for anomalies/errors
  - `AdvisoryList` - List display for security/performance advisories
- **`monitoring/monitoringUtils.ts`** - Shared utility functions:
  - `getTooltipDescriptions()` - i18n tooltip text helper
- **`monitoring/stats/`** - Individual statistics display components:
  - `DatabaseStats.tsx` - Database connections, slow queries, table statistics
  - `AuthStats.tsx` - Authentication events, signups, password resets
  - `EdgeFunctionStats.tsx` - Edge Functions invocations and errors
  - `EmailStatsDisplay.tsx` - Email (SES) sends, deliveries, bounces
  - `CloudflareStatsDisplay.tsx` - Cloudflare Workers requests and errors
  - `VercelStatsDisplay.tsx` - Vercel deployment status and history

**Features:**

- System health overview cards (Database, Auth, Edge Functions, Email)
- Anomaly detection and alerts
- Security and performance advisories
- Detailed statistics sections (collapsible)
- Modular component architecture for easy maintenance

**Data Sources:**

| Service        | Data                                         | Source                           |
| -------------- | -------------------------------------------- | -------------------------------- |
| Database       | Connections, table stats, RLS check, indexes | PostgreSQL pg_stat views via RPC |
| Auth           | Signups, password resets, recent events      | auth.audit_log_entries           |
| Edge Functions | Invocations, errors, error rate              | download_requests table (proxy)  |
| Email (SES)    | Sends, deliveries, bounces, complaints       | AWS SES GetSendStatistics API    |
| Cloudflare     | Requests, errors, error rate                 | Cloudflare GraphQL Analytics API |
| Vercel         | Recent deployments, status                   | Vercel Deployments API           |

**Edge Function:** `get-monitoring-data`

- Requires admin access (checks admin_emails table)
- Uses AWS SigV4 for SES API calls
- Supports graceful degradation (shows "Not Configured" if secrets missing)
- Calls PostgreSQL RPC functions via service_role client (admin check already verified in Edge Function)

**PostgreSQL RPC Functions Security:**

- All monitoring functions (`get_active_connections`, `get_slow_queries`, `get_table_stats`, `get_tables_without_rls`, `get_missing_indexes`) include admin access checks
- Helper function `is_admin_user()` verifies user email against `admin_emails` table
- Functions skip admin check when called by `service_role` (allows Edge Function to call them)
- Direct calls by authenticated users require admin privileges (throws exception if not admin)

**Required Secrets (Supabase):**

- `AWS_ACCESS_KEY_ID` - For SES monitoring
- `AWS_SECRET_ACCESS_KEY` - For SES monitoring
- `AWS_REGION` - (optional, defaults to eu-central-1)
- `CLOUDFLARE_API_TOKEN` - For Cloudflare analytics
- `CLOUDFLARE_ACCOUNT_ID` - (optional, for account filtering)
- `VERCEL_API_TOKEN` - For Vercel deployments
- `VERCEL_PROJECT_ID` - (optional, for project filtering)

**Visual Indicators:**

- Color-coded table rows for database issues
- Health status badges (healthy/warning/error/unknown)
- Tooltips explaining each metric (in Hebrew)
- Legend for color meanings

**Limitations:**

- Failed logins not tracked (Supabase limitation - doesn't log failed attempts)

1. Create `download_events` table
2. Create Edge Function to track downloads
3. Integrate tracking in Landing Page

#### AdminTrendsChart

Interactive charts with date range filtering.

**Features:**

- Date range controls (month, year, all time, custom)
- Uses `useDateControls` hook from main dashboard
- Three charts:
  1. User Growth (AreaChart)
  2. Financial Trends (AreaChart - stacked)
  3. Activity (LineChart - dual lines)

**Colors:**

- User growth: purple (`hsl(262, 83%, 58%)`)
- Income: green (`hsl(var(--chart-green))`)
- Donations: yellow (`hsl(var(--chart-yellow))`)
- Expenses: red (`hsl(var(--chart-red))`)

### Service Layer

#### Admin Service

**File:** `src/lib/data-layer/admin.service.ts`

**Functions:**

- `fetchAdminDashboardStats()` - Get all statistics
- `fetchAdminMonthlyTrends(startDate?, endDate?)` - Get trends with date range
- `fetchEarliestSystemDate()` - Get earliest system date
- `checkIsAdmin()` - Check if current user is admin

**Exported via:** `src/lib/data-layer/index.ts`

#### Monitoring Service

**Files:**

- `src/lib/data-layer/monitoring.service.ts` - Service functions
- `src/lib/data-layer/monitoring.types.ts` - TypeScript types and interfaces

**Service Functions:**

- `fetchMonitoringData()` - Fetch monitoring data from Edge Function
- `calculateSystemHealth(data)` - Calculate system health overview
- `getRecentErrors(data)` - Get recent errors from monitoring data
- `getWarnings(data)` - Get warnings from monitoring data
- `getSecurityAdvisories(data)` - Get security advisories
- `getPerformanceAdvisories(data)` - Get performance advisories
- `formatTimestamp(timestamp, locale?)` - Format timestamp for display
- `formatDuration(ms)` - Format milliseconds to readable duration

**Types:**

All TypeScript interfaces are exported from `monitoring.types.ts`:

- `MonitoringData` - Main monitoring data structure
- `SystemHealthOverview` - System health status
- `DatabaseStats`, `AuthStats`, `EdgeFunctionStats`, `EmailStats`, `CloudflareStats`, `VercelStats`
- `Anomaly`, `Advisory`, `ServiceHealth`, etc.

**Note:** Types are re-exported from `monitoring.service.ts` for convenience, but the source of truth is `monitoring.types.ts`.

## Internationalization (i18n)

**Namespace:** `admin`

**Translation files:**

- `public/locales/he/admin.json`
- `public/locales/en/admin.json`

**Keys structure:**

```json
{
  "title": "Admin Dashboard title",
  "tabs": { ... },
  "users": { ... },
  "finance": { ... },
  "downloads": { ... },
  "engagement": { ... },
  "system": { ... },
  "trends": { ... },
  "errors": { ... }
}
```

**Added to:** `src/lib/i18n.ts` namespace list

## Styling & Design

### Design Principles

- Uses existing StatCard and MagicStatCard components for consistency
- Follows project's color scheme and theming
- Full dark mode support
- RTL/LTR support with `dir={i18n.dir()}`
- Responsive design for all screen sizes

### Color Schemes

Reuses project's established color schemes:

- **Purple:** User-related metrics
- **Green:** Income, active items, positive metrics
- **Red:** Expenses, negative metrics
- **Blue:** Donations (special case - uses yellow for main card)
- **Orange:** System metrics, time-based metrics
- **Yellow:** Donations (gold color)

### Responsive Breakpoints

- Mobile: 1 column, smaller text, short tab labels
- Tablet (md): 2-3 columns
- Desktop (lg): 4 columns, full tab labels

## Usage

### Accessing the Dashboard

1. Navigate to `/admin` URL (no link in sidebar)
2. Must be logged in with whitelisted email
3. Web platform only

### Adding/Removing Admins

**Via Supabase SQL Editor:**

```sql
-- Add admin
INSERT INTO admin_emails (email, notes)
VALUES ('new-admin@example.com', 'Description');

-- Remove admin
DELETE FROM admin_emails WHERE email = 'admin@example.com';

-- View all admins (as admin)
SELECT * FROM admin_emails;
```

## Future Enhancements

### Download Tracking

To implement download tracking:

1. **Create table:**

```sql
CREATE TABLE download_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform TEXT NOT NULL CHECK (platform IN ('windows', 'mac', 'linux')),
  version TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

2. **Create Edge Function:** `track-download`
3. **Update Landing Page:** Add tracking call on download
4. **Update RPC:** Modify `get_admin_dashboard_stats` to query download_events

### Additional Metrics

Potential future additions:

- Retention rate
- Churn rate
- DAU/MAU ratio
- Average session duration
- Most popular features
- Contact message statistics
- Response time metrics

## Testing Checklist

### Security Testing

- [ ] Access `/admin` with admin email - should work
- [ ] Access `/admin` with non-admin email - should redirect to home
- [ ] Try to call RPC from F12 console - should fail with "Access denied"
- [ ] Try to call monitoring RPC functions directly (get_active_connections, etc.) - should fail with "Access denied" if not admin
- [ ] Access from desktop version - should redirect to home
- [ ] Check Network tab - no sensitive data exposed
- [ ] Verify Edge Function can call monitoring functions (via service_role) - should work

### Functionality Testing

- [ ] All statistics display correctly
- [ ] Date range filtering works (month, year, all time, custom)
- [ ] Charts update when changing date range
- [ ] Currency breakdown shows ILS first, then USD
- [ ] Charts display correctly in light and dark mode
- [ ] All text translates properly (Hebrew/English)
- [ ] RTL/LTR layout works correctly
- [ ] Responsive on mobile, tablet, desktop

### Visual Testing

- [ ] Numbers are large and readable
- [ ] Charts use correct colors (green, yellow, red)
- [ ] User growth chart shows purple area
- [ ] Financial chart shows stacked areas
- [ ] Activity chart shows dual lines
- [ ] Total managed card is centered and prominent
- [ ] All cards use consistent styling

## Troubleshooting

### "Access denied" error

- Verify user email is in `admin_emails` table
- Check user is authenticated
- Verify RLS policies are enabled

### Charts not updating

- Check browser console for errors
- Verify RPC function returns data
- Check date range parameters

### Platform redirect loop

- Verify `PlatformContext` is working
- Check `beforeLoad` logic in routes.ts
- Ensure `__TAURI_INTERNALS__` detection works

## Related Documentation

- [Supabase Integration Status](../backend/supabase-integration-status.md)
- [Multi-Language Support Guide](../ui/multi-language-and-responsive-design-guide.md)
- [Translation Map](../ui/translation-map.md)
- [Project Structure](../project-structure.md)
