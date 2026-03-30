# Analytics Page — Feature Guide

## Overview

The Analytics page (`/analytics`) provides a personal finance dashboard with automatic insights, charts, and a daily activity heatmap. It is available to both Web (Supabase) and Desktop (Tauri/SQLite) users.

**Location in the app:**
- Route: `/analytics`
- Sidebar: after the Transactions Table, icon `PieChart` (lucide-react)
- Page file: `src/pages/AnalyticsPage.tsx`
- i18n namespace: `dashboard`, keys under `analytics.*`

---

## Architecture and Data Flow

```
AnalyticsPage
├── useServerStats(dateRange, user, platform)
│     └── income, expenses, donations totals for selected range
├── usePeriodComparison(dateRange, user, platform)
│     └── prevIncome, prevExpenses for the equivalent prior period
└── useInsights(dateRange, user, platform)
      ├── categoryData          ← fetchCategoryBreakdown (by typeGroup)
      ├── activeRecurring       ← Supabase/Tauri directly (status=active)
      ├── paymentMethodData     ← fetchPaymentMethodBreakdown
      ├── recurringVsOnetimeData ← fetchRecurringVsOnetime
      ├── recipientsData        ← fetchDonationRecipientsBreakdown
      └── heatmapData           ← fetchDailyHeatmap (by typeGroup + year)
```

### Date Range

Controlled by `useDateControls`. Supports:
- "From start of month"
- "From start of year"
- "All time" (`startDate === "1970-01-01"`, `isAllTime = true`)
- Custom range

### Period Comparison

`usePeriodComparison` calls `getPreviousPeriodRange(startDate, endDate)` to compute a prior period of identical length immediately before the current range. Fetches income/expenses/donations for that prior period in parallel.

The actual prior-period dates are passed as `prevPeriodStart`/`prevPeriodEnd` to `InsightsSummaryRow` for display in the tooltip.

---

## Layout Structure

```
┌─────────────────────────────────────────────────────┐
│  Title + PDF Export button (same row as date filters) │
│  Date Range Buttons + Custom Picker                   │
├─────────────────────────────────────────────────────┤
│  InsightsSummaryRow  │  TransactionHeatmap            │
│  TextInsightsCard    │                                │
├───────────────────────┬─────────────────────────────┤
│  CategoryBreakdownChart │  PaymentMethodInsight       │
├───────────────────────┴─────────────────────────────┤
│  RecurringForecastInsight │ RecurringRatioInsight │ DonationRecipientsInsight │
└─────────────────────────────────────────────────────┘
```

---

## Components (`src/components/analytics/`)

### InsightsSummaryRow

**Purpose:** Always-visible row of 3 KPI cards showing derived metrics not shown on the home dashboard.

**Cards:**
1. **Savings Rate** — `(income - expenses) / income * 100`
2. **Fixed Expenses %** — `recurringExpenses / totalExpenses * 100` (from `activeRecurring`)
3. **Period Comparison** — `(income - prevIncome) / prevIncome * 100`

**Key behaviors:**
- Shows skeleton cards while loading (maintains height)
- Always renders 3 slots; uses "—" placeholder when data unavailable
- `isAllTime=true` → period comparison card shows "not applicable" badge
- Tooltip for period comparison includes actual prior-period dates
- Mobile: always 3 columns (`grid-cols-3`), smaller font

### TextInsightsCard

**Purpose:** Auto-generated text insights (rule-based, no AI) based on loaded data.

**Rules (fires up to 4 insights):**
1. **Savings rate** — always fires when `income > 0`
2. **Top expense category** — fires when `categoryData` has entries
3. **Recurring expenses ratio** — fires when `recurringPct > 60%`
4. **Period comparison delta** — fires when `|delta| >= 10%` and prior data available
5. **No categories tip** — fires when no categories are set on transactions

**Key behaviors:**
- Shows skeleton while loading (maintains height)
- Returns `null` only after loading if no insights fire at all
- `min-h-[80px]` on CardContent ensures minimum height

### TransactionHeatmap

**Purpose:** GitHub-style daily activity calendar showing transaction intensity.

**Features:**
- 5 intensity levels per cell (0=no data, 1–4 light to dark)
- **Type tabs in header:** all / income / expense / donation — triggers new data fetch
- **Year tabs:** appear when data spans >1 year; filters to selected year client-side
- **Colors per type:** teal=all, green=income, red=expense, yellow=donation
- **Cell scaling:** larger cells when fewer weeks (16px for ≤6 weeks, down to 11px for 27+)
- Horizontal scroll for long ranges
- **Legend bar** at bottom showing low→high gradient
- `id="pdf-chart-heatmap"` for PDF capture
- Tab sizing fix: `TabsList h-8 p-0.5`, `TabsTrigger h-7` to prevent active tab overflow

**Tab interaction:** `heatmapTypeGroup` state in `useInsights` triggers refetch when changed.

### CategoryBreakdownChart

**Purpose:** Bar/pie chart of expenses (or income) broken down by category.

**Features:**
- Tab toggle: Expenses / Income (changes `categoryType` → new fetch)
- Bar/Pie chart toggle with `BarChart2`/`PieChart` icons
- **Fixed height:** max 7 rows × 40px = 280px (no dynamic growth)
- Bar colors: gradient by type (red=expense, green=income, yellow=donation)
- **Pie colors:** shadcn ChartConfig pattern — `slice-0..4` keys → `var(--color-slice-N)` on Cell
- `id="pdf-chart-categories"` on wrapper outside AnimatePresence (captures both bar and pie)
- AnimatePresence key includes `categoryType` for smooth tab-switch animation

### PaymentMethodInsight

**Purpose:** Bar/pie chart of expenses by payment method.

**Features:**
- Bar/Pie chart toggle
- Payment method labels: translated via `useTranslation("transactions")` directly (not i18n singleton)
- Fixed height: max 7 rows
- **Pie colors:** same `slice-0..4` pattern as categories
- `id="pdf-chart-payment"` on wrapper outside AnimatePresence

### RecurringForecastInsight

**Purpose:** List of active recurring transactions grouped by type.

**Features:**
- Three tabs: Expenses / Income / Donations
- AnimatePresence with `key={activeTab}` for smooth slide animation
- `max-h-52 overflow-y-auto` on list for scrolling when many items
- CountUp animated totals per tab
- Compact item cards (`py-1.5`, small font)
- `h-full` on motion wrapper and Card for uniform row height

### RecurringRatioInsight

**Purpose:** Shows what % of each transaction type comes from recurring (standing orders).

**Features:**
- 3 animated progress bars: Expenses / Income / Donations
- Per-type calculation: `recurringTotals.expenses / serverTotalExpenses * 100`
- `recurringTotals` computed in `AnalyticsPage` via `useMemo` on `activeRecurring`
- Falls back to combined recurring/onetime split from `recurringVsOnetimeData` when totals unavailable

### DonationRecipientsInsight

**Purpose:** Bar/pie chart of donations grouped by description/recipient.

**Features:**
- Grouped by `COALESCE(description, recipient, 'other')` — description takes priority since users rarely fill recipient field
- Bar/Pie toggle (same pattern as CategoryBreakdownChart)
- Fixed height: max 7 rows × 40px
- Pie colors: yellow/amber gradient
- `id="pdf-chart-donations"` for PDF capture

### CashFlowInsight, TitheSummaryInsight

These components exist in `src/components/analytics/` but are **not currently used** in `AnalyticsPage.tsx`. They were built as alternatives and may be reintroduced in future.

---

## Hooks

### `useInsights` — `src/hooks/useInsights.ts`

Central hook for all analytics-specific data fetching.

```typescript
useInsights(activeDateRangeObject, user, platform): {
  categoryData, isLoadingCategory, categoryError,
  categoryType, setCategoryType,
  activeRecurring, isLoadingRecurring, recurringError,
  paymentMethodData, isLoadingPaymentMethod, paymentMethodError,
  recurringVsOnetimeData, isLoadingRecurringRatio, recurringRatioError,
  recipientsData, isLoadingRecipients, recipientsError,
  heatmapData, isLoadingHeatmap, heatmapError,
  heatmapTypeGroup, setHeatmapTypeGroup,
}
```

**Refetch triggers:** date range change, platform change, `lastDbFetchTimestamp` change, `categoryType` change, `heatmapTypeGroup` change.

**`activeRecurring` fetch:** Delegated to `fetchActiveRecurring()` in `insights.service.ts`. Web: queries `recurring_transactions` table via Supabase with `status = 'active'`. Desktop: invokes `get_recurring_transactions_handler` with `args: { sorting: { field: "next_due_date", direction: "asc" }, filters: { statuses: ["active"], ... } }`.

**`getPreviousPeriodRange`:** Utility in `src/lib/utils/date-range.ts` — computes prior period of same duration immediately before the current range. Re-exported from `useInsights` for backward compatibility.

### `usePeriodComparison` — `src/hooks/usePeriodComparison.ts`

Fetches `prevIncome`, `prevExpenses`, `prevDonations` for the prior period using `Promise.all`.

---

## Data Service — `src/lib/data-layer/insights.service.ts`

All functions support both platforms via `getPlatform()`.

| Function | Supabase RPC | Tauri Command |
|---|---|---|
| `fetchCategoryBreakdown(start, end, type)` | `get_category_breakdown` | `get_desktop_category_breakdown` |
| `fetchPaymentMethodBreakdown(start, end)` | `get_payment_method_breakdown` | `get_desktop_payment_method_breakdown` |
| `fetchRecurringVsOnetime(start, end)` | `get_recurring_vs_onetime` | `get_desktop_recurring_vs_onetime` |
| `fetchDonationRecipientsBreakdown(start, end)` | `get_donation_recipients_breakdown` | `get_desktop_donation_recipients_breakdown` |
| `fetchDailyHeatmap(start, end, typeGroup)` | `get_daily_transaction_heatmap` | `get_desktop_daily_heatmap` |
| `fetchActiveRecurring()` | direct table query (`status=active`) | `get_recurring_transactions_handler` |

**Note:** `fetchRecurringForecast` was removed — it was legacy code not consumed by the UI. Active recurring data comes via `fetchActiveRecurring()` in `insights.service.ts`. The SQL function `get_recurring_forecast` still exists in Supabase but is no longer called from TypeScript or Rust.

**Key types:** `CategoryBreakdownItem`, `PaymentMethodBreakdownItem`, `RecurringVsOnetimeItem`, `DonationRecipientItem` (with `last_description`), `DailyHeatmapItem`, `HeatmapTypeGroup`, `CategoryType`.

---

## Supabase RPCs

All RPCs: `SECURITY DEFINER SET search_path = public`, use `auth.uid()` internally, SELECT only — no schema changes.

| RPC | Parameters | Returns |
|---|---|---|
| `get_category_breakdown` | `p_start_date, p_end_date, p_type_group DEFAULT 'all'` | `category, total_amount` |
| `get_payment_method_breakdown` | `p_start_date, p_end_date` | `payment_method, total_amount` |
| `get_recurring_vs_onetime` | `p_start_date, p_end_date` | `is_recurring, total_amount, tx_count` |
| `get_donation_recipients_breakdown` | `p_start_date, p_end_date` | `recipient, total_amount, last_description` |
| `get_daily_transaction_heatmap` | `p_start_date, p_end_date, p_type_group DEFAULT 'all'` | `tx_date, tx_count, total_amount` |
| `get_recurring_forecast` | _(none)_ | `type, total_amount, tx_count` |

**`p_type_group` values:** `'all'`, `'income'` (income+exempt-income), `'expense'` (expense+recognized-expense), `'donation'` (donation+non_tithe_donation).

**Donation recipients grouping:** Groups by `COALESCE(NULLIF(TRIM(description),''), NULLIF(TRIM(recipient),''), 'other')` — description has priority over recipient field.

### Migrations (in order)

1. `20260324171800_add_analytics_rpcs.sql` — initial 5 analytics RPCs
2. `20260325115226_add_heatmap_rpc.sql` — heatmap RPC
3. `20260325125322_update_heatmap_and_recipients_rpcs.sql` — add `p_type_group` to heatmap; add `last_description` to recipients
4. `20260325152414_fix_donation_recipients_by_description.sql` — rewrite recipients grouping to prioritize description field
5. `20260325161050_fix_donation_recipients_order_and_limit.sql` — increase recipients LIMIT to 50

### Web ↔ Desktop Parity Checklist

Last verified: branch `feature/analytics-page`. When changing any insight's SQL or Rust logic, verify all columns below remain in sync:

| Insight | Web LIMIT | Desktop LIMIT | Grouping logic | Type filter |
|---|---|---|---|---|
| Category | 10 | 10 | `COALESCE(category, 'other')` | expense/income/donation arrays |
| Payment Methods | 20 | 20 | `COALESCE(payment_method, 'other')` | `expense + recognized-expense` |
| Recurring vs Onetime | none | none | `source_recurring_id IS NOT NULL` | excludes `initial_balance` |
| Donation Recipients | 50 | 50 | description → recipient → 'other' | `donation + non_tithe_donation` |
| Heatmap | none | none | `GROUP BY date` | optional type_group filter |

All 5 insights are in full parity as of the above migrations.

### Hook Fetch Dependency Map

Understanding what triggers each fetch prevents accidental over-fetching:

| Data | Depends on date range? | Re-fetches on |
|---|---|---|
| `activeRecurring` | No | platform, lastDbFetchTimestamp |
| `titheBalance` | No | user, platform, lastDbFetchTimestamp |
| `categoryBreakdown` | Yes | startDate, endDate, categoryType, platform, lastDbFetchTimestamp |
| `paymentMethods` | Yes | startDate, endDate, platform, lastDbFetchTimestamp (batched) |
| `recurringVsOnetime` | Yes | startDate, endDate, platform, lastDbFetchTimestamp (batched) |
| `recipients` | Yes | startDate, endDate, platform, lastDbFetchTimestamp (batched) |
| `heatmap` | No (always all-time) | heatmapTypeGroup, platform, lastDbFetchTimestamp |
| `income/expenses/donations` | Yes | startDate, endDate, user, platform, lastDbFetchTimestamp |
| `prevIncome/prevExpenses` | Yes (previous period) | startDate, endDate, user, platform, lastDbFetchTimestamp |

---

## Desktop Tauri Commands — `src-tauri/src/commands/insights_commands.rs`

5 active commands (parallel to the Supabase RPCs):

- `get_desktop_category_breakdown(start, end, transaction_type)` — SQLite GROUP BY category
- `get_desktop_payment_method_breakdown(start, end)` — expenses only, GROUP BY payment_method
- `get_desktop_recurring_vs_onetime(start, end)` — GROUP BY `source_recurring_id IS NOT NULL`
- `get_desktop_donation_recipients_breakdown(start, end)` — GROUP BY `COALESCE(description, recipient, 'other')`
- `get_desktop_daily_heatmap(start, end, type_group: Option<String>)` — GROUP BY date

**Removed:** `get_desktop_recurring_forecast` — was legacy, not consumed by the UI. Active recurring transactions are fetched via `get_recurring_transactions_handler` (existing command, shared with the Recurring Transactions page).

Registered in `src-tauri/src/commands/mod.rs` and `src-tauri/src/main.rs` `generate_handler!`.

---

## PDF Export

### Libraries
- `html-to-image` (npm) — capture DOM elements as PNG
- `pdf-lib` + `@pdf-lib/fontkit` — generate PDF
- `src/lib/utils/pdf-helpers.ts` — shared RTL utilities

### Capture Pattern
Each chart component has a wrapper `<div id="pdf-chart-XXX">` placed **outside** `AnimatePresence` so both bar and pie views can be captured:

```
pdf-chart-categories  → CategoryBreakdownChart
pdf-chart-payment     → PaymentMethodInsight
pdf-chart-heatmap     → TransactionHeatmap
pdf-chart-donations   → DonationRecipientsInsight
```

**Double-call pattern** for html-to-image (primes SVG/font cache):
```typescript
await toPng(el, opts).catch(() => {});  // prime cache
return toPng(el, opts);                 // actual capture
```

### RTL Text in PDF

`src/lib/utils/pdf-helpers.ts` exports:
- `splitTextSegments(text)` — splits Hebrew+number text into typed segments (handles commas in numbers)
- `drawRtlText(page, text, rightX, y, font, size, color)` — draws RTL text with numbers staying LTR

**Regex note:** Uses `/(\d[\d,\.\/:\-]*\d|\d)/g` — handles `1,234.56`, dates, times without reversing internal digits.

### State Object Pattern (multi-page closure fix)

`handleExportPdf` uses a `state` object to avoid closure bugs when `page` changes on new page creation:
```typescript
const state = { page: pdfDoc.addPage(), y: 0, width: 0, height: 0 };
const ensureSpace = (needed) => {
  if (state.y < margin + needed) {
    state.page = pdfDoc.addPage();  // all closures read state.page
    ...
  }
};
```

### Platform-Specific Save
- **Web:** `blob + link.click()` with `toast.success` after download
- **Desktop:** `@tauri-apps/plugin-dialog` `save()` dialog → `@tauri-apps/plugin-fs` `writeFile()`

---

## Design System Additions

### New Chart CSS Variables (`src/index.css`)

Added to `:root` and `.dark`:
```css
--chart-blue:   213 94% 68%;
--chart-purple: 271 81% 56%;
--chart-teal:   182 70% 45%;
--chart-orange: 25 95% 53%;
```

(Existing: `--chart-green`, `--chart-yellow`, `--chart-red`)

### Pie Chart Colors — shadcn ChartConfig Pattern

CSS custom properties from SVG `fill` attribute don't resolve CSS vars. The correct pattern:

1. Define `slice-0..4` in `ChartConfig` with actual chart color vars
2. `ChartContainer` injects `--color-slice-N: hsl(...)` as resolved computed values
3. Cell uses `fill={`var(--color-slice-${index % 5})`}` — works because it's a resolved value

```typescript
const chartConfig: ChartConfig = {
  "slice-0": { color: "hsl(var(--chart-teal))" },
  "slice-1": { color: "hsl(var(--chart-blue))" },
  "slice-2": { color: "hsl(var(--chart-yellow))" },
  "slice-3": { color: "hsl(var(--chart-orange))" },
  "slice-4": { color: "hsl(var(--chart-purple))" },
};
// Cell: fill={`var(--color-slice-${index % 5})`}
```

### Fixed-Height Charts

All 3 bar/pie chart components use fixed height to maintain uniform row height:
- Max 7 visible rows: `Math.min(data.length, 7) * 40`
- Minimum 280px for categories, 160px for payment methods

---

## i18n

**Namespace:** `dashboard`
**Key prefix:** `analytics.*`

Key groups:
- `analytics.cashFlow.*` — cash flow labels
- `analytics.categories.*` — category breakdown
- `analytics.tithe.*` — tithe summary
- `analytics.forecast.*` — standing orders / recurring
- `analytics.paymentMethods.*` — payment methods
- `analytics.recurringRatio.*` — recurring vs one-time
- `analytics.recurringRatioByType.*` — per-type ratio
- `analytics.recipients.*` — donation recipients
- `analytics.heatmap.*` — transaction heatmap (includes `typeAll`, `legendLow`, `legendHigh`)
- `analytics.insights.*` — text insights (includes `topCategory`)
- `analytics.insightsSummary.*` — KPI summary row (includes `periodComparisonTooltipWithDates`)

Files: `public/locales/he/dashboard.json` and `public/locales/en/dashboard.json`

---

## Performance Notes

- `recurringTotals` (sum by type from `activeRecurring`) is computed with `useMemo` in `AnalyticsPage` to avoid 3 passes on every render
- `useServerStats` uses `Promise.allSettled` for 3 range-sensitive fetches (income, expenses, donations); **tithe balance** runs in a separate effect that does not re-fetch on date range changes
- `useInsights`: **`activeRecurring`** runs in a separate effect independent of date range; **payment methods, recurring ratio, recipients** are batched in a single `Promise.allSettled` so their setState calls resolve in one React 18 batch
- `usePeriodComparison` includes `lastDbFetchTimestamp` to stay in sync with the rest of the analytics data after a DB change
- `TextInsightsCard.insights` computed inside `useMemo` with `fmt` defined internally (avoids broken memoization from external function reference)
- `DeltaBadge` defined at module level in `InsightsSummaryRow` (not inside render function) to avoid unmount/remount animations

### When to consider deeper backend batching

Before implementing a combined RPC or further aggregation, measure first:

| Signal | Recommended action |
|---|---|
| Network DevTools shows ≥6 sequential/slow requests per range change | Consider a `get_analytics_summary(start, end)` RPC combining income+expenses+donations |
| React Profiler shows excessive commits from chart components | Add `React.memo` to heavy chart wrappers |
| Heatmap query takes >500ms (visible in DevTools) | Add a year/range cap or aggregation tier |
| No bottleneck found after measurement | Do NOT add batching — current architecture is clean and maintainable |

Current fetch count per date range change (after optimization):
- **Range-dependent:** category (1) + [payment+ratio+recipients] (1 batched) + [income+expenses+donations] (1 batched) + period comparison (1) = **4 network round-trips**
- **Range-independent:** activeRecurring and titheBalance do NOT re-fetch on range change
