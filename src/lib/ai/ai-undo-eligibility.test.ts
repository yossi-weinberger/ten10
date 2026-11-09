import { describe, expect, it } from "vitest";
import { canUndoAiTransaction } from "./ai-undo-eligibility";

const now = Date.parse("2026-10-19T12:00:00.000Z");

describe("canUndoAiTransaction", () => {
  it("allows a fresh unedited row", () => {
    expect(canUndoAiTransaction({
      created_at: "2026-10-19T11:00:00.000Z",
      updated_at: "2026-10-19T11:00:00.000Z",
    }, now)).toBe(true);
  });

  it("hides a row that was edited", () => {
    expect(canUndoAiTransaction({
      created_at: "2026-10-19T11:00:00.000Z",
      updated_at: "2026-10-19T11:05:00.000Z",
    }, now)).toBe(false);
  });

  it("hides a row older than 7 days", () => {
    expect(canUndoAiTransaction({
      created_at: "2026-10-10T11:00:00.000Z",
      updated_at: "2026-10-10T11:00:00.000Z",
    }, now)).toBe(false);
  });
});
