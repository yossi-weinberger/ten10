import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { rpc },
}));

import { readUndoPayload, undoAiTransaction } from "./undo-text-intake";

describe("undoAiTransaction", () => {
  beforeEach(() => {
    rpc.mockReset();
  });

  it("undoes by the transaction id", async () => {
    rpc.mockResolvedValue({ data: { reverted: true }, error: null });

    await expect(undoAiTransaction("tx-1")).resolves.toEqual({
      ok: true,
      alreadyReverted: false,
    });
    expect(rpc).toHaveBeenCalledWith("undo_ai_transaction", {
      p_transaction_id: "tx-1",
    });
  });
});

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
