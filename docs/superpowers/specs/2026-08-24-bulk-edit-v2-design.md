# Bulk Edit V2

## Goal

Make bulk edit match what the dialog already looks like: the user can change
several allowed fields in one save, and only those fields are written. The
current exclusive field picker is misleading and is the V1 defect to fix.

## Interaction Design

- The dialog is a form of independent fields, not a single-field toggle.
- Every field starts **untouched**. Submit stays disabled until at least one
  field is touched.
- A touched text field can be **set** or **cleared**. An untouched field is
  omitted from the payload and must not change in the database.
- One save applies every touched field in a single atomic update.
- Cancel still preserves selection. Successful save still clears it.
- Existing Dialog/Drawer variant locking, pending guards, RTL/LTR, and
  loaded-only selection stay unchanged.
- Adaptive single-row selection still opens the existing singular edit flow.

## Allowed Fields

Both tables (transactions and recurring) use the same field set and the same
availability rules.

| Field | Limit | Availability |
| --- | --- | --- |
| `payment_method` | 50 chars | Always, except blocked rows |
| `category` | 50 chars | Homogeneous income or expense family |
| `description` | 100 chars | Always, except blocked rows |
| `recipient` | 50 chars | Every selected row is `donation` or `non_tithe_donation` |
| `is_chomesh` | boolean | Every selected row has the **same** type, and that type allows chomesh: `income`, `donation`, `expense`, or `recognized-expense` |

Blocked rows still apply to the whole dialog:

- Any `initial_balance` row blocks every transaction bulk field.
- Any `completed` recurring row blocks every recurring bulk field.
- Bulk delete remains available with the existing warnings.

Unavailable fields are hidden or shown as disabled with the existing reason
copy. They must not appear editable.

## Still Out of Scope

- Amount, currency, date, type
- Recurring `status` (still races with the executor)
- Select-all-filtered
- Undo
- Changing `isFromPersonalFunds` / exempt flags as separate bulk fields

## Backend Contract

Replace the single `p_field` + `p_value` updaters with one JSON patch:

```text
bulk_update_user_transactions(p_user_id uuid, p_ids uuid[], p_updates jsonb) → integer
bulk_update_user_recurring_transactions(p_user_id uuid, p_ids uuid[], p_updates jsonb) → integer
```

`p_updates` key presence means "write this field". JSON `null` means clear.
Missing keys stay unchanged. Unknown keys are rejected. Empty objects are
rejected.

One `UPDATE` writes every requested column and `updated_at`. Desktop Tauri
mirrors the same patch in one SQLite transaction.

Keep the existing ownership guard, exact-count locking, `SECURITY INVOKER`,
empty `search_path`, and postgres ownership. Drop the old four-argument
signatures in the same forward migration so they cannot remain callable.

Server-side rules must match the table above, including the 100-character
description limit and the exact-type chomesh check. Do not trust the UI.

## Patch Shape

```typescript
type TransactionBulkPatch = {
  payment_method?: string | null;
  category?: string | null;
  description?: string | null;
  recipient?: string | null;
  is_chomesh?: boolean;
};

type RecurringBulkPatch = TransactionBulkPatch;
```

A helper builds the patch from per-field `untouched | set | clear` actions
and runs the same length / availability checks the backends enforce.

## Assumptions

- Implement on a dedicated branch (`feat/bulk-edit-v2`), not inside PR #397.
- Recurring gets the same fields and UI. Status stays deferred.
- Chomesh uses exact type equality, not category-family grouping.
- `exempt-income` and `non_tithe_donation` cannot receive bulk chomesh.
