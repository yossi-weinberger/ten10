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
   - Email whitelist verification in every function
   - Raises exception if user is not authenticated or not in whitelist

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
│       └── AdminTrendsChart.tsx        # Interactive charts
├── lib/
│   └── data-layer/
│       └── admin.service.ts            # Admin API service
└── routes.ts                           # Route definition with protection
```

### Components

#### AdminDashboardPage

Main page with tab-based navigation.

**Tabs:**

1. **Users** - User statistics + engagement + system info
2. **Finance** - Financial overview with currency breakdown
3. **Trends** - Interactive charts with date range controls
4. **Downloads** - Desktop download tracking (placeholder)

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

**File:** `src/lib/data-layer/admin.service.ts`

**Functions:**

- `fetchAdminDashboardStats()` - Get all statistics
- `fetchAdminMonthlyTrends(startDate?, endDate?)` - Get trends with date range
- `fetchEarliestSystemDate()` - Get earliest system date
- `checkIsAdmin()` - Check if current user is admin

**Exported via:** `src/lib/data-layer/index.ts`

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
- [ ] Access from desktop version - should redirect to home
- [ ] Check Network tab - no sensitive data exposed

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
