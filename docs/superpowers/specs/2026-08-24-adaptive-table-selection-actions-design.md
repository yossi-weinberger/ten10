# Adaptive Table Selection Actions

## Goal

Make checkbox selection behave like the existing row action menu when exactly
one row is selected, while preserving the current bulk workflow for two or more
selected rows.

## Interaction Design

- No selection: hide the selection toolbar.
- One selected row:
  - Show singular edit and delete labels.
  - Edit opens the existing single-row edit flow.
  - Delete opens the existing single-row confirmation flow.
  - Opening balances and recurring definitions retain their existing specialized
    handlers and restrictions.
  - Cancel keeps the row selected.
  - A successful edit or delete clears the selection.
- Two or more selected rows:
  - Keep the existing limited-field bulk editor.
  - Keep the existing atomic bulk delete confirmation.
  - Keep all current bulk availability rules.

The behavior applies consistently to the transactions and recurring-transactions
tables. `BulkActionsToolbar` remains presentation-only; each table chooses the
singular or bulk handler based on `selectedCount`.

## Bulk Field Layout

- One available field: one full-width column.
- Two available fields: two equal-width columns.
- Three or more fields: two columns on small screens and three on larger screens.
- Every field button stretches to the grid row height and uses the same minimum
  height. Wrapped labels therefore cannot make sibling buttons appear shorter.

## Accessibility and Internationalization

- Existing singular and bulk translations remain distinct.
- Existing keyboard, focus, Dialog/Drawer, pending, RTL, and LTR behavior remains.
- Button labels may wrap, but their hit areas and visual heights stay equal.

## Verification

- Test singular-versus-bulk handler routing for both tables.
- Test that cancel preserves a single selection and successful actions clear it.
- Test that bulk restrictions apply only when multiple rows are selected.
- Verify equal field-button heights with English wrapping and Hebrew RTL.
- Run focused tests, ESLint, React Doctor, and the production build.
