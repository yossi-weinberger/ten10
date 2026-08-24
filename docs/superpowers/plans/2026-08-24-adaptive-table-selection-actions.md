# Adaptive Table Selection Actions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route one selected row through the existing single-row actions, retain bulk actions for multiple rows, and keep bulk field selectors equal-height in every language.

**Architecture:** Keep `BulkActionsToolbar` presentation-only. Add small pure helpers for selection mode and field-grid layout, then let each table display choose existing singular handlers or existing bulk handlers. Extend edit modals with a distinct success callback so cancellation preserves selection while successful single-row actions clear it.

**Tech Stack:** React 19, TypeScript, Zustand, Radix Toggle Group, shadcn Dialog/Drawer, Vitest, Tailwind CSS.

## Global Constraints

- No new dependency.
- No backend, RPC, migration, or data-layer changes.
- Existing single-row and bulk validation rules remain authoritative.
- Cancel preserves a single-row selection; successful edit/delete clears it.
- RTL/LTR, keyboard interaction, responsive Dialog/Drawer locking, and pending guards remain unchanged.

---

### Task 1: Add Selection and Grid Policy Helpers

**Files:**
- Modify: `src/lib/tableTransactions/bulkActions.ts`
- Test: `src/lib/tableTransactions/bulkActions.test.ts`

**Interfaces:**
- Produces: `getSelectionActionMode(selectedCount: number): "none" | "single" | "bulk"`
- Produces: `getBulkFieldGridClassName(fieldCount: number): string`

- [ ] **Step 1: Write failing helper tests**

```typescript
expect(getSelectionActionMode(0)).toBe("none");
expect(getSelectionActionMode(1)).toBe("single");
expect(getSelectionActionMode(2)).toBe("bulk");

expect(getBulkFieldGridClassName(1)).toContain("grid-cols-1");
expect(getBulkFieldGridClassName(2)).toContain("grid-cols-2");
expect(getBulkFieldGridClassName(3)).toContain("sm:grid-cols-3");
```

- [ ] **Step 2: Run tests and verify RED**

Run:

```bash
npm test -- src/lib/tableTransactions/bulkActions.test.ts
```

Expected: FAIL because both helpers are missing.

- [ ] **Step 3: Implement the pure helpers**

```typescript
export type SelectionActionMode = "none" | "single" | "bulk";

export function getSelectionActionMode(selectedCount: number): SelectionActionMode {
  if (selectedCount <= 0) return "none";
  return selectedCount === 1 ? "single" : "bulk";
}

export function getBulkFieldGridClassName(fieldCount: number): string {
  if (fieldCount <= 1) return "grid-cols-1";
  if (fieldCount === 2) return "grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3";
}
```

- [ ] **Step 4: Run tests and verify GREEN**

Run:

```bash
npm test -- src/lib/tableTransactions/bulkActions.test.ts
```

Expected: all tests pass.

### Task 2: Route Single Selection Through Existing Row Actions

**Files:**
- Modify: `src/components/TransactionsTable/TransactionsTableDisplay.tsx`
- Modify: `src/components/TransactionsTable/RecurringTransactionsTableDisplay.tsx`
- Modify: `src/components/TransactionsTable/TransactionEditModal.tsx`
- Modify: `src/components/TransactionsTable/RecurringTransactionEditModal.tsx`

**Interfaces:**
- Consumes: `getSelectionActionMode`
- Produces: optional `onSubmitSuccess?: () => void` modal callbacks separate from `onClose`

- [ ] **Step 1: Add success callbacks without changing cancel behavior**

For both edit modals, call `onSubmitSuccess` only after a successful form submission, then call `onClose`. Keep `onCancel={onClose}`.

```typescript
interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
  transaction: Transaction | null;
}

const handleSubmitSuccess = () => {
  onSubmitSuccess?.();
  onClose();
};
```

- [ ] **Step 2: Add adaptive handlers to both table displays**

```typescript
const selectionActionMode = getSelectionActionMode(selection.selectedCount);

const handleSelectionEdit = () => {
  const row = selectedTransactions[0];
  if (selectionActionMode === "single" && row) {
    handleEditInitiate(row);
    return;
  }
  handleBulkEditClick();
};

const handleSelectionDelete = () => {
  const row = selectedTransactions[0];
  if (selectionActionMode === "single" && row) {
    handleDeleteInitiate(row);
    return;
  }
  setIsBulkDeleteDialogOpen(true);
};
```

Apply the equivalent recurring handlers with `handleEditClick` and `handleDeleteClick`.

- [ ] **Step 3: Preserve existing singular restrictions**

- Transactions: opening balances route through `OpeningBalanceModal`.
- Recurring transactions: disable singular edit when the selected row is `completed`.
- Bulk availability checks apply only in `bulk` mode.
- Delete remains available in both modes.

- [ ] **Step 4: Clear selection only after successful singular actions**

- Single delete: clear after the service resolves successfully.
- Normal transaction edit: pass `onSubmitSuccess={clearSelection}`.
- Recurring edit: pass `onSubmitSuccess={clearSelection}`.
- Opening-balance update: call `clearSelection()` after `handleUpdateOpeningBalance` succeeds.
- Cancel paths call only `onClose`, preserving selection.

- [ ] **Step 5: Use singular labels for one row**

Pass existing `actions.edit` / `actions.delete` labels in single mode and existing bulk toolbar labels in bulk mode. No translation keys are added.

- [ ] **Step 6: Verify focused behavior**

Run:

```bash
npm test -- src/lib/tableTransactions/bulkActions.test.ts
npx eslint src/components/TransactionsTable/TransactionsTableDisplay.tsx src/components/TransactionsTable/RecurringTransactionsTableDisplay.tsx src/components/TransactionsTable/TransactionEditModal.tsx src/components/TransactionsTable/RecurringTransactionEditModal.tsx
```

Expected: tests and lint pass with no new diagnostics.

### Task 3: Equalize Bulk Field Buttons

**Files:**
- Modify: `src/components/TransactionsTable/BulkEditDialog.tsx`
- Test: `src/lib/tableTransactions/bulkActions.test.ts`

**Interfaces:**
- Consumes: `getBulkFieldGridClassName`

- [ ] **Step 1: Apply the adaptive grid**

```tsx
<ToggleGroup
  className={cn("grid items-stretch gap-2", getBulkFieldGridClassName(fields.length))}
>
```

- [ ] **Step 2: Stretch every field item**

```tsx
className={cn(
  "h-full min-h-14 justify-start gap-2 whitespace-normal rounded-md border px-3 py-2 text-start",
  "hover:bg-accent hover:text-accent-foreground",
  "data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
  dir === "rtl" && "text-right",
)}
```

Use `min-h-14` for both Drawer and Dialog so wrapped English labels and one-line labels share the same row height and touch target.

- [ ] **Step 3: Verify responsive and language behavior**

Check:

- English desktop with “Payment Method” and “Category”.
- Hebrew desktop in RTL.
- Mobile Drawer with two fields.
- Keyboard focus and selected-state contrast.

Run:

```bash
npm run build
npx react-doctor@latest --verbose --scope changed
git diff --check
```

Expected: build succeeds, no new React Doctor regression, and diff check is clean.

### Task 4: Final Verification

**Files:**
- Modify if needed: `llm-instructions/features/transactions/transactions-table-technical-overview.md`

- [ ] **Step 1: Run focused tests**

```bash
npm test -- src/lib/tableTransactions/bulkActions.test.ts src/lib/tableTransactions/bulkOperations.store.test.ts
```

- [ ] **Step 2: Run changed-file TypeScript and lint checks**

Verify no diagnostics reference the modified files.

- [ ] **Step 3: Run production build**

```bash
npm run build
```

- [ ] **Step 4: Review the final diff**

Confirm:

- One selected row never opens `BulkEditDialog`.
- Two or more selected rows still use atomic bulk actions.
- Cancel preserves single selection.
- Successful singular action clears selection.
- Field buttons remain equal-height in English, Hebrew, Dialog, and Drawer.
- No backend or migration file changed.
