import { describe, expect, it } from "vitest";
import type { SplitDraft } from "@/lib/ai/split-cards";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import {
  draftSaveBlocker,
  saveFailureStatus,
  splitDraftsAfterSave,
  splitDraftsAfterUndo,
  undoFailureStatus,
} from "./assistant-drawer-thread";

const draft: TextTransactionDraft = {
  date: "2026-11-01",
  amount: 15,
  currency: "ILS",
  type: "expense",
  requestedRate: null,
  description: "מאפים",
  category: "food",
  paymentMethod: null,
};

const card = (over: Partial<SplitDraft> = {}): SplitDraft => ({
  key: "a",
  description: "מאפים",
  amount: 15,
  currency: "ILS",
  date: "2026-11-01",
  type: "expense",
  category: null,
  paymentMethod: null,
  isChomesh: false,
  checked: true,
  transactionId: null,
  itemId: null,
  ...over,
});

describe("draftSaveBlocker", () => {
  it("accepts a dated draft with a number", () => {
    expect(draftSaveBlocker(draft, "15")).toBeNull();
  });

  it("rejects a missing date, a date before the floor, or a blank amount", () => {
    expect(draftSaveBlocker({ ...draft, date: "not-a-date" }, "15")).toBe("editDateInvalid");
    expect(draftSaveBlocker({ ...draft, date: "1980-01-01" }, "15")).toBe("dateMin");
    expect(draftSaveBlocker(draft, "")).toBe("editAmountInvalid");
  });
});

describe("failure statuses", () => {
  it("maps save and undo reasons the drawer already shows", () => {
    expect(saveFailureStatus("NO_RATE")).toBe("noRateAvailable");
    expect(saveFailureStatus("SAVE_FAILED")).toBe("saveFailed");
    expect(undoFailureStatus("NOT_ALLOWED")).toBe("undoNotAllowed");
    expect(undoFailureStatus("UNDO_FAILED")).toBe("undoFailed");
  });
});

describe("splitDraftsAfterSave", () => {
  it("locks only the rows that were saved", () => {
    const rows = [card({ key: "a" }), card({ key: "b" })];
    expect(splitDraftsAfterSave(rows, [
      { key: "a", transactionId: "t1", itemId: "i1" },
    ])).toEqual([
      { ...rows[0], transactionId: "t1", itemId: "i1", checked: false },
      rows[1],
    ]);
  });
});

describe("splitDraftsAfterUndo", () => {
  it("reopens the undone row and leaves a missing list as null", () => {
    const rows = [card({ key: "a", transactionId: "t1", itemId: "i1", checked: false })];
    expect(splitDraftsAfterUndo(rows, "a")).toEqual([
      { ...rows[0], transactionId: null, itemId: null, checked: true },
    ]);
    expect(splitDraftsAfterUndo(null, "a")).toBeNull();
  });
});
