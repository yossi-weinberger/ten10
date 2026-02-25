# Analytics / Budget Insights Page

## Overview

The Analytics page (`/analytics`, `src/pages/AnalyticsPage.tsx`) provides in-depth financial insights based on the user's transaction data. It is accessible from the Sidebar and is a protected route requiring authentication.

**Principle**: All insights are displayed **only** on the `/analytics` page. The home page (dashboard) remains unchanged.

## Components

| Component | File | Purpose |
|---|---|---|
| AnalyticsPage | `src/pages/AnalyticsPage.tsx` | Main page with date filter and layout |
| FinancialHealthScore | `src/components/analytics/FinancialHealthScore.tsx` | Circular score ring (0–100) with factor breakdown |
| SmartInsights | `src/components/analytics/SmartInsights.tsx` | Colored insight cards with impact indicators |
| TopDrivers | `src/components/analytics/TopDrivers.tsx` | Top 3 ranked impact factors |
| CashFlowChart | `src/components/analytics/CashFlowChart.tsx` | Monthly bar chart (income/expenses/net) |
| ExpensesByCategoryChart | `src/components/analytics/ExpensesByCategoryChart.tsx` | Donut chart for category breakdown |
| AnalyticsExportButton | `src/components/analytics/AnalyticsExportButton.tsx` | CSV export of analytics data |

## Backend / Data Layer

| Service | File | Purpose |
|---|---|---|
| insights-engine | `src/lib/insights-engine.ts` | Score calculation, insight generation, driver ranking |
| insights.service | `src/lib/data-layer/insights.service.ts` | Previous period data fetch for comparisons |
| category-analytics.service | `src/lib/data-layer/category-analytics.service.ts` | Category/payment method/daily expense fetching |

## New Supabase RPCs

Migration: `supabase/migrations/20260225_add_analytics_category_rpcs.sql`

| RPC | Parameters | Returns |
|---|---|---|
| `get_expenses_by_category` | `p_user_id`, `p_start_date`, `p_end_date` | `TABLE(category TEXT, total_amount NUMERIC)` |
| `get_income_by_category` | `p_user_id`, `p_start_date`, `p_end_date` | `TABLE(category TEXT, total_amount NUMERIC)` |
| `get_expenses_by_payment_method` | `p_user_id`, `p_start_date`, `p_end_date` | `TABLE(payment_method TEXT, total_amount NUMERIC)` |
| `get_daily_expenses` | `p_user_id`, `p_start_date`, `p_end_date` | `TABLE(expense_date DATE, total_amount NUMERIC)` |

**Note**: Corresponding Tauri/Desktop commands need to be implemented in Rust for desktop parity.

## Health Score Formula

Score = savings (max 40) + tithe (max 30) + trend (max 30) = 0–100

- **Savings factor** (40 pts): Based on `(income - expenses) / income` ratio
- **Tithe factor** (30 pts): Based on tithe balance status (0 = fully paid = 30 pts)
- **Trend factor** (30 pts): Based on month-over-month expense change

Labels: ≥80 Excellent, ≥60 Good, ≥40 Fair, <40 Needs Improvement.

## Translation Files

- `public/locales/he/analytics.json`
- `public/locales/en/analytics.json`

Namespace: `analytics` (lazy-loaded via i18next HTTP backend).

## Design Guidelines

- All components use CSS variables (no hard-coded colors)
- Full dark/light mode support
- RTL/LTR responsive
- Every widget shows period label
- Info tooltips on all scores/charts explain the calculation methodology
- Global date filter at top applies to all widgets

## What's Out of Scope

- Email/reminder automations
- Operational features unrelated to analytics
- The home page dashboard is not modified
