# Hebrew Calendar Guide

Gregorian ISO (`YYYY-MM-DD`) stays the stored and queried date. Hebrew is a presentation and scheduling layer on top of that.

**Settings:** `calendarType` (`gregorian` | `hebrew`) and `showSecondaryDate`. Default is Gregorian for every user, including Hebrew-UI users. The primary calendar owns period presets, charts, and pickers. The secondary date is display-only.

## Shared adapter

Canonical implementation: `supabase/functions/_shared/calendar/index.ts`.  
The web app re-exports it from `src/lib/calendar/index.ts`. Deno and Vite must stay in parity.

Core library: `temporal-polyfill/full` (MIT). Do not add `@hebcal/*` for date math. Israel holiday labels live in `supabase/functions/_shared/calendar/israel-yom-tov.ts`.

Overflow is always `constrain` (clamp). Hebrew day 30 in a 29-day month becomes 29. Adar I in a common year normalizes to Adar. Monthly Hebrew recurring runs in both Adar I and Adar II in a leap year.

Hebrew year start is 1 Tishrei. There is no `maaserYearStart`.

## Display and input

- Format through `formatDisplayDate` / `useDisplayDate`.
- Pickers use `src/lib/calendar/hebrew-date-lib.ts` with `react-day-picker` when `calendarType === "hebrew"`.
- Typed input stays `DD/MM/YYYY` Gregorian in both calendars.
- Exports always keep a Gregorian column. CSV and Excel add a Hebrew column when Hebrew is the primary calendar or when the secondary date is enabled.

## Periods and charts

`src/lib/calendar/calendar-period.ts` builds Gregorian ISO boundaries from the active calendar. Server RPCs and Tauri commands receive those boundaries. They do not interpret Hebrew themselves.

`get_period_financial_summary` / `get_desktop_period_financial_summary` are the flexible aggregators. `date_trunc('month')` helpers remain Gregorian-only for compatibility.

## Recurring

`recurring_transactions.calendar_type` defaults to `gregorian`. Optional `anchor_month_code` is for yearly Hebrew rules (Adar I vs Adar). Shared recurrence math lives with the adapter (`advanceMonthlyRecurringDate`, `advanceYearlyRecurringDate`, clamp, first due, catch-up).

## Reminders

`profiles.reminder_calendar_type` is independent of display `calendarType`. Monthly days resolve per calendar. Israel Friday/Saturday and Yom Tov are skipped, with makeup on the next eligible civil day.

Erev Rosh Hashanah (29 Elul) sends an annual maaser-year close reminder to users who already opted into reminders.

## Maaser year report

The lifetime tithe balance stays all-time. Do not reset it.

The Analytics card uses Hebrew year bounds (1 Tishrei–29 Elul) plus `calculate_user_tithe_balance(uuid, date)` / `get_desktop_tithe_balance_as_of`. Opening balance is as of the day before 1 Tishrei.

## Out of scope

Diaspora second festival days, sunset-based day boundaries, and Hebrew typed input in the picker.

See also `docs/research/2026-09-18-hebrew-calendar-research.md`.
