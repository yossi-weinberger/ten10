import { describe, expect, it } from "vitest";
import { readUndoPayload } from "./undo-text-intake";

describe("readUndoPayload", () => {
  it("accepts a fresh revert", () => {
    expect(readUndoPayload({ reverted: true })).toEqual({
      ok: true,
      alreadyReverted: false,
    });
  });

  it("accepts a second click", () => {
    expect(readUndoPayload({ alreadyReverted: true })).toEqual({
      ok: true,
      alreadyReverted: true,
    });
  });

  it("rejects an edited or expired transaction", () => {
    expect(readUndoPayload({ error: "UNDO_NOT_ALLOWED" })).toEqual({
      ok: false,
      reason: "NOT_ALLOWED",
    });
    expect(readUndoPayload(null)).toEqual({
      ok: false,
      reason: "NOT_ALLOWED",
    });
  });
});
