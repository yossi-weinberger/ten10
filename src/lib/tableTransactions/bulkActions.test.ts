import { describe, expect, it } from "vitest";
import {
  getBulkCategoryFamily,
  getBulkEditAvailability,
  isRecurringBulkStatusValue,
  RECURRING_BULK_STATUS_VALUES,
  type RecurringBulkChange,
  type RecurringBulkRow,
  type TransactionBulkChange,
  type TransactionBulkRow,
} from "@/lib/tableTransactions/bulkActions";
import {
  getLoadedSelectionState,
  getLoadedSelectionSnapshot,
  pruneSelectionToLoadedIds,
  pruneSelectionStateToLoadedIds,
  toggleAllLoadedIds,
  toggleSelectedId,
} from "@/hooks/useLoadedRowSelection";

const transactionRow = (
  overrides: Partial<TransactionBulkRow> = {},
): TransactionBulkRow => ({
  id: "tx-1",
  type: "income",
  payment_method: null,
  category: null,
  ...overrides,
});

const recurringRow = (
  overrides: Partial<RecurringBulkRow> = {},
): RecurringBulkRow => ({
  id: "rec-1",
  type: "income",
  status: "active",
  payment_method: null,
  category: null,
  ...overrides,
});

const validTransactionChange: TransactionBulkChange = {
  kind: "transaction",
  field: "category",
  value: null,
};
const validRecurringStatusChange: RecurringBulkChange = {
  kind: "recurring",
  field: "status",
  value: "paused",
};
const validRecurringNullableChange: RecurringBulkChange = {
  kind: "recurring",
  field: "payment_method",
  value: null,
};

// @ts-expect-error recurring bulk status cannot be null.
const invalidRecurringNullStatusChange: RecurringBulkChange = {
  kind: "recurring",
  field: "status",
  value: null,
};

// @ts-expect-error completed is not a mutable recurring bulk status.
const invalidRecurringCompletedStatusChange: RecurringBulkChange = {
  kind: "recurring",
  field: "status",
  value: "completed",
};

void invalidRecurringNullStatusChange;
void invalidRecurringCompletedStatusChange;

describe("bulk action field availability", () => {
  it("blocks transaction bulk edits for an empty selection", () => {
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [],
        field: "payment_method",
      }),
    ).toEqual({ allowed: false, reason: "empty-selection" });
  });

  it("allows transaction payment method edits for normal rows", () => {
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [
          transactionRow({ id: "income", type: "income" }),
          transactionRow({ id: "expense", type: "expense" }),
        ],
        field: "payment_method",
      }),
    ).toEqual({ allowed: true });
  });

  it("allows transaction category edits inside the income family", () => {
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [
          transactionRow({ id: "income", type: "income" }),
          transactionRow({ id: "exempt", type: "exempt-income" }),
        ],
        field: "category",
      }),
    ).toEqual({ allowed: true });
  });

  it("allows transaction category edits inside the expense family", () => {
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [
          transactionRow({ id: "expense", type: "expense" }),
          transactionRow({ id: "recognized", type: "recognized-expense" }),
        ],
        field: "category",
      }),
    ).toEqual({ allowed: true });
  });

  it("blocks transaction category edits across income and expense families", () => {
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [
          transactionRow({ id: "income", type: "income" }),
          transactionRow({ id: "expense", type: "expense" }),
        ],
        field: "category",
      }),
    ).toEqual({ allowed: false, reason: "mixed-category-family" });
  });

  it("blocks every transaction bulk edit when initial balance is selected", () => {
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [
          transactionRow({ id: "income", type: "income" }),
          transactionRow({ id: "initial", type: "initial_balance" }),
        ],
        field: "payment_method",
      }),
    ).toEqual({ allowed: false, reason: "initial-balance" });
  });

  it("allows recurring status and payment method edits for open rows", () => {
    expect(
      getBulkEditAvailability({
        kind: "recurring",
        rows: [recurringRow({ id: "active", status: "active" })],
        field: "status",
      }),
    ).toEqual({ allowed: true });

    expect(
      getBulkEditAvailability({
        kind: "recurring",
        rows: [recurringRow({ id: "paused", status: "paused" })],
        field: "payment_method",
      }),
    ).toEqual({ allowed: true });
  });

  it("uses the same category family rules for recurring rows", () => {
    expect(
      getBulkEditAvailability({
        kind: "recurring",
        rows: [
          recurringRow({ id: "income", type: "income" }),
          recurringRow({ id: "expense", type: "expense" }),
        ],
        field: "category",
      }),
    ).toEqual({ allowed: false, reason: "mixed-category-family" });
  });

  it("blocks every recurring bulk edit when a completed row is selected", () => {
    expect(
      getBulkEditAvailability({
        kind: "recurring",
        rows: [
          recurringRow({ id: "active", status: "active" }),
          recurringRow({ id: "completed", status: "completed" }),
        ],
        field: "payment_method",
      }),
    ).toEqual({ allowed: false, reason: "completed-recurring" });
  });

  it("allows only active, paused, and cancelled as recurring bulk status values", () => {
    expect(RECURRING_BULK_STATUS_VALUES).toEqual([
      "active",
      "paused",
      "cancelled",
    ]);
    expect(isRecurringBulkStatusValue("active")).toBe(true);
    expect(isRecurringBulkStatusValue("paused")).toBe(true);
    expect(isRecurringBulkStatusValue("cancelled")).toBe(true);
    expect(isRecurringBulkStatusValue("completed")).toBe(false);
  });

  it("returns the homogeneous category family for category-capable rows", () => {
    expect(
      getBulkCategoryFamily([
        transactionRow({ id: "income", type: "income" }),
        transactionRow({ id: "exempt", type: "exempt-income" }),
      ]),
    ).toBe("income");
    expect(
      getBulkCategoryFamily([
        transactionRow({ id: "expense", type: "expense" }),
        transactionRow({ id: "recognized", type: "recognized-expense" }),
      ]),
    ).toBe("expense");
    expect(
      getBulkCategoryFamily([
        transactionRow({ id: "income", type: "income" }),
        transactionRow({ id: "expense", type: "expense" }),
      ]),
    ).toBeNull();
    expect(
      getBulkCategoryFamily([
        transactionRow({ id: "donation", type: "donation" }),
      ]),
    ).toBeNull();
  });

  it("models discriminated bulk change values", () => {
    expect(validTransactionChange).toEqual({
      kind: "transaction",
      field: "category",
      value: null,
    });
    expect(validRecurringStatusChange).toEqual({
      kind: "recurring",
      field: "status",
      value: "paused",
    });
    expect(validRecurringNullableChange).toEqual({
      kind: "recurring",
      field: "payment_method",
      value: null,
    });
  });
});

describe("loaded row selection helpers", () => {
  it("toggles a single selected id without mutating the previous set", () => {
    const previous = new Set(["row-1"]);
    const next = toggleSelectedId(previous, "row-2");

    expect([...previous]).toEqual(["row-1"]);
    expect([...next].sort()).toEqual(["row-1", "row-2"]);
    expect([...toggleSelectedId(next, "row-1")]).toEqual(["row-2"]);
  });

  it("toggles all loaded ids and drops unloaded selections", () => {
    expect([...toggleAllLoadedIds(new Set(["other"]), ["row-1", "row-2"])]).toEqual([
      "row-1",
      "row-2",
    ]);

    expect([
      ...toggleAllLoadedIds(
        new Set(["other", "row-1", "row-2"]),
        ["row-1", "row-2"],
      ),
    ]).toEqual([]);
  });

  it("does not resurrect an id that was pruned when it returns later", () => {
    const initial = getLoadedSelectionSnapshot(new Set(["row-1"]), ["row-1"]);
    const afterRemove = getLoadedSelectionSnapshot(initial.selectedIds, []);
    const afterReturn = getLoadedSelectionSnapshot(afterRemove.selectedIds, [
      "row-1",
    ]);

    expect([...afterRemove.selectedIds]).toEqual([]);
    expect([...afterReturn.selectedIds]).toEqual([]);
  });

  it("returns the same selection set when pruning does not change it", () => {
    const selectedIds = new Set(["row-1"]);

    expect(pruneSelectionStateToLoadedIds(selectedIds, ["row-1", "row-2"])).toBe(
      selectedIds,
    );
  });

  it("reports empty, checked, unchecked, and indeterminate loaded selection states", () => {
    expect(getLoadedSelectionState(new Set(), [])).toEqual({
      checked: false,
      selectedLoadedCount: 0,
      loadedCount: 0,
    });
    expect(getLoadedSelectionState(new Set(), ["row-1"])).toEqual({
      checked: false,
      selectedLoadedCount: 0,
      loadedCount: 1,
    });
    expect(getLoadedSelectionState(new Set(["row-1"]), ["row-1"])).toEqual({
      checked: true,
      selectedLoadedCount: 1,
      loadedCount: 1,
    });
    expect(
      getLoadedSelectionState(new Set(["row-1"]), ["row-1", "row-2"]),
    ).toEqual({
      checked: "indeterminate",
      selectedLoadedCount: 1,
      loadedCount: 2,
    });
  });

  it("prunes selected ids that are no longer loaded", () => {
    expect([
      ...pruneSelectionToLoadedIds(new Set(["row-1", "stale"]), ["row-1"]),
    ]).toEqual(["row-1"]);
  });
});
