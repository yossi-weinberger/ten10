---
description: "Standards for charts, analytics components, and financial visualizations in TEN10. Apply when writing or reviewing any chart, dashboard, or analytics UI."
alwaysApply: true
---

# Charts & Analytics Standards (TEN10)

## 1. Chart Library & Primitives

- **Always** use `<ChartContainer>` + `<ChartTooltipContent>` from `@/components/ui/chart` — never bare Recharts.
- Define colors in `ChartConfig` using CSS variables:
  ```ts
  const chartConfig: ChartConfig = {
    income:    { label: t("..."), color: "hsl(var(--chart-green))" },
    expenses:  { label: t("..."), color: "hsl(var(--chart-red))"   },
    donations: { label: t("..."), color: "hsl(var(--chart-yellow))"},
    net:       { label: t("..."), color: "hsl(var(--chart-blue))"  },
  };
  ```
- **Never** hardcode hex colors inside chart components.

## 2. RTL / LTR in Charts

- Wrap the chart `Card` with `dir={i18n.dir()}`.
- Numeric axes (`<XAxis>`, `<YAxis>`) and their containers **must** always have `dir="ltr"` — numbers never flip.
  ```tsx
  <div dir="ltr">
    <ChartContainer config={chartConfig} className="w-full">
      ...
    </ChartContainer>
  </div>
  ```
- Horizontal bar chart label `textAnchor`: use `"end"` in RTL, `"start"` in LTR.
- Month labels on X-axis: format with `date-fns` locale via `i18n.language` (import `he`/`enUS` as done in `MonthlyChart`).

## 3. Dark / Light Mode

- **Forbidden** class names in chart components: `bg-white`, `bg-gray-*`, `text-black`, `text-gray-900`, any hardcoded color.
- **Required**: `bg-background`, `bg-card`, `text-foreground`, `text-muted-foreground`, `border-border`.
- `ChartContainer` handles dark/light automatically via CSS variables — no manual theme switching needed.

## 4. Responsive Charts

- Chart wrapper: `className="w-full min-h-[200px] md:min-h-[300px]"`.
- For KPI card grids: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4`.
- On mobile, prefer stacking sections vertically: `grid-cols-1 md:grid-cols-2`.
- Bar chart horizontal labels: use `truncate` with `width` on `<Cell>` labels to avoid overflow.

## 5. i18n in Charts

- **All** axis labels, tooltip labels, legend items, section titles, KPI labels, empty states, loading text — from `useTranslation("dashboard")`.
- Currency display: `formatCurrency(value, defaultCurrency, i18n.language)` from `@/lib/utils/currency`.
- No Hebrew or English strings hardcoded in JSX.
- Empty state: always render a localized message, never an empty container.

## 6. Loading & Error States

Every analytics component must handle all 4 states:
```tsx
if (isLoading) return <LoadingSkeleton />;       // skeleton or spinner
if (error)     return <ErrorMessage />;           // localized error text
if (!data || data.length === 0) return <EmptyState />;  // localized empty text
return <ActualChart />;
```

## 7. Web + Desktop Parity

- Every data-fetching service for analytics must have **both** implementations:
  ```ts
  if (platform === "web")     { return supabase.rpc("get_xxx", {...}); }
  if (platform === "desktop") { return invoke("get_desktop_xxx", {...}); }
  ```
- New Rust commands: `#[tauri::command]` in `src-tauri/src/commands/insights_commands.rs`.
- Register every new command in `src-tauri/src/commands/mod.rs` + `src-tauri/src/main.rs` `generate_handler!`.
- Use `transaction_types.rs` helpers (`income_types_condition()` etc.) in all Rust SQL — never hardcode type lists.

## 8. Supabase RPC Security Pattern

- Analytics RPCs use `auth.uid()` internally — **never** accept `p_user_id` as a parameter.
- Always: `SECURITY DEFINER SET search_path = public`.
- Type groups in SQL (do not filter on single type):
  - `expense` tab → `ARRAY['expense','recognized-expense']`
  - `income` tab → `ARRAY['income','exempt-income']`
  - `donation` tab → `ARRAY['donation','non_tithe_donation']`
- Exclude `initial_balance` from all analytics aggregations.
