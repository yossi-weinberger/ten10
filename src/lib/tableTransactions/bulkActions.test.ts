import { describe, expect, it } from "vitest";
import {
  assertBulkPatch,
  assertBulkTextValue,
  buildBulkPatch,
  BULK_TEXT_VALUE_MAX_LENGTH,
  getBulkCategoryFamily,
  getBulkChomeshType,
  getBulkEditAvailability,
  shouldShowBulkChomeshField,
  displayedBulkChomeshChecked,
  displayedBulkTextValue,
  getBulkFieldGridClassName,
  getSharedBulkValues,
  nextBulkChomeshAction,
  nextBulkTextAction,
  getBulkRecipientFamily,
  getSelectionActionMode,
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
const validRecurringNullableChange: RecurringBulkChange = {
  kind: "recurring",
  field: "payment_method",
  value: null,
};

const invalidRecurringStatusChange: RecurringBulkChange = {
  kind: "recurring",
  // @ts-expect-error recurring status changes are intentionally unavailable in bulk.
  field: "status",
  value: "paused",
};

void invalidRecurringStatusChange;

describe("selection action policy helpers", () => {
  it("maps selected row counts to action modes", () => {
    expect(getSelectionActionMode(0)).toBe("none");
    expect(getSelectionActionMode(1)).toBe("single");
    expect(getSelectionActionMode(2)).toBe("bulk");
  });

  it("maps editable field counts to responsive grid classes", () => {
    expect(getBulkFieldGridClassName(1)).toContain("grid-cols-1");
    expect(getBulkFieldGridClassName(2)).toContain("grid-cols-2");
    expect(getBulkFieldGridClassName(3)).toContain("sm:grid-cols-3");
  });

  it("rejects bulk text values longer than the shared schema limit", () => {
    expect(() => assertBulkTextValue(null)).not.toThrow();
    expect(() =>
      assertBulkTextValue("a".repeat(BULK_TEXT_VALUE_MAX_LENGTH)),
    ).not.toThrow();
    expect(() =>
      assertBulkTextValue("a".repeat(BULK_TEXT_VALUE_MAX_LENGTH + 1)),
    ).toThrow("50 character limit");
  });
});

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

  it("allows recurring payment method edits for open rows", () => {
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

  it("allows description like payment method and gates recipient and chomesh", () => {
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [
          transactionRow({ id: "income", type: "income" }),
          transactionRow({ id: "expense", type: "expense" }),
        ],
        field: "description",
      }),
    ).toEqual({ allowed: true });
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [
          transactionRow({ id: "donation", type: "donation" }),
          transactionRow({
            id: "personal",
            type: "non_tithe_donation",
          }),
        ],
        field: "recipient",
      }),
    ).toEqual({ allowed: true });
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [
          transactionRow({ id: "donation", type: "donation" }),
          transactionRow({ id: "expense", type: "expense" }),
        ],
        field: "recipient",
      }),
    ).toEqual({ allowed: false, reason: "recipient-not-applicable" });
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [
          transactionRow({ id: "a", type: "income" }),
          transactionRow({ id: "b", type: "income" }),
        ],
        field: "is_chomesh",
      }),
    ).toEqual({ allowed: true });
    expect(
      getBulkEditAvailability({
        kind: "transaction",
        rows: [
          transactionRow({ id: "income", type: "income" }),
          transactionRow({ id: "exempt", type: "exempt-income" }),
        ],
        field: "is_chomesh",
      }),
    ).toEqual({ allowed: false, reason: "chomesh-not-applicable" });
  });

  it("returns shared bulk values only when every selected row matches", () => {
    expect(
      getSharedBulkValues([
        {
          category: "food",
          payment_method: "cash",
          description: "Lunch",
          recipient: null,
          is_chomesh: true,
        },
        {
          category: "food",
          payment_method: "cash",
          description: " Lunch ",
          recipient: "",
          is_chomesh: true,
        },
      ]),
    ).toEqual({
      category: "food",
      payment_method: "cash",
      description: "Lunch",
      recipient: null,
      is_chomesh: true,
    });

    expect(
      getSharedBulkValues([
        { category: "food", is_chomesh: true },
        { category: "housing", is_chomesh: false },
      ]),
    ).toEqual({
      category: undefined,
      payment_method: null,
      description: null,
      recipient: null,
      is_chomesh: undefined,
    });

    expect(
      getSharedBulkValues([
        { category: null, description: "", is_chomesh: false },
        { category: "  ", description: null, is_chomesh: null },
      ]),
    ).toEqual({
      category: null,
      payment_method: null,
      description: null,
      recipient: null,
      is_chomesh: false,
    });

    expect(getSharedBulkValues([])).toEqual({
      category: undefined,
      payment_method: undefined,
      description: undefined,
      recipient: undefined,
      is_chomesh: undefined,
    });
  });

  it("keeps shared values displayed without marking fields touched", () => {
    const untouched = { action: "untouched" as const };

    expect(displayedBulkTextValue(untouched, "food")).toBe("food");
    expect(displayedBulkTextValue(untouched, undefined)).toBe("");
    expect(displayedBulkChomeshChecked(untouched, true)).toBe(true);
    expect(displayedBulkChomeshChecked(untouched, false)).toBe(false);
    expect(displayedBulkChomeshChecked(untouched, undefined)).toBe(false);

    expect(nextBulkTextAction("food", "food")).toEqual({ action: "untouched" });
    expect(nextBulkTextAction(null, "food")).toEqual({ action: "clear" });
    expect(nextBulkTextAction(null, null)).toEqual({ action: "untouched" });
    expect(nextBulkTextAction("housing", "food")).toEqual({
      action: "set",
      value: "housing",
    });
    expect(nextBulkChomeshAction(false, true)).toEqual({
      action: "set",
      value: false,
    });
    expect(nextBulkChomeshAction(true, true)).toEqual({ action: "untouched" });
    expect(nextBulkChomeshAction(true, undefined)).toEqual({
      action: "set",
      value: true,
    });

    expect(
      buildBulkPatch({
        payment_method: { action: "untouched" },
        category: { action: "untouched" },
        description: { action: "untouched" },
        recipient: { action: "untouched" },
        is_chomesh: { action: "untouched" },
      }),
    ).toEqual({});
  });

  it("shows donation chomesh only when chomesh is tracked separately", () => {
    expect(shouldShowBulkChomeshField("income", false)).toBe(true);
    expect(shouldShowBulkChomeshField("recognized-expense", false)).toBe(true);
    expect(shouldShowBulkChomeshField("donation", false)).toBe(false);
    expect(shouldShowBulkChomeshField("donation", true)).toBe(true);
    expect(shouldShowBulkChomeshField(null, true)).toBe(false);
  });

  it("builds a patch from touched fields only", () => {
    expect(getBulkChomeshType([{ type: "income" }, { type: "income" }])).toBe(
      "income",
    );
    expect(
      getBulkChomeshType([{ type: "income" }, { type: "exempt-income" }]),
    ).toBeNull();
    expect(getBulkChomeshType([{ type: "expense" }, { type: "expense" }])).toBeNull();
    expect(
      getBulkChomeshType([
        { type: "recognized-expense" },
        { type: "recognized-expense" },
      ]),
    ).toBe("recognized-expense");
    expect(
      getBulkRecipientFamily([
        { type: "donation" },
        { type: "non_tithe_donation" },
      ]),
    ).toBe(true);
    expect(
      getBulkRecipientFamily([{ type: "donation" }, { type: "expense" }]),
    ).toBeNull();

    expect(
      buildBulkPatch({
        payment_method: { action: "set", value: "cash" },
        category: { action: "untouched" },
        description: { action: "clear" },
        recipient: { action: "untouched" },
        is_chomesh: { action: "untouched" },
      }),
    ).toEqual({ payment_method: "cash", description: null });

    expect(() => assertBulkPatch({})).toThrow();
    expect(() => assertBulkPatch({ description: "a".repeat(101) })).toThrow(
      "100",
    );
  });

  it("models discriminated bulk change values", () => {
    expect(validTransactionChange).toEqual({
      kind: "transaction",
      field: "category",
      value: null,
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
