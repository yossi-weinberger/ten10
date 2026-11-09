import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";

const rpc = vi.hoisted(() => vi.fn());
const getUser = vi.hoisted(() => vi.fn());
const single = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: { getUser },
    from: () => ({
      select: () => ({
        eq: () => ({ single }),
      }),
    }),
    rpc,
  },
}));

vi.mock("@/lib/ai/flags", () => ({
  aiCallsAllowed: () => true,
}));

import { nextDraftIdempotency, saveTextDraft } from "./save-text-draft";

const draft: TextTransactionDraft = {
  date: "2026-10-23",
  amount: 20,
  currency: "ILS",
  type: "expense",
  requestedRate: null,
  description: "לחם",
  category: "food",
  paymentMethod: null,
};

const identity = {
  description: "לחם",
  amount: "20",
  type: "expense",
  date: "2026-10-23",
};

describe("nextDraftIdempotency", () => {
  it("creates a new key when the description changes", () => {
    const first = nextDraftIdempotency(null, identity, { createKey: () => "one" });
    const second = nextDraftIdempotency(first, { ...identity, description: "חלב" }, {
      createKey: () => "two",
    });
    expect(second.key).toBe("two");
  });

  it("creates a new key after a failed save", () => {
    const first = nextDraftIdempotency(null, identity, { createKey: () => "one" });
    const second = nextDraftIdempotency(first, identity, {
      saveFailed: true,
      createKey: () => "two",
    });
    expect(second.key).toBe("two");
    const retry = nextDraftIdempotency(second, identity, { createKey: () => "three" });
    expect(retry.key).toBe("two");
  });
});

describe("saveTextDraft idempotency", () => {
  beforeEach(() => {
    rpc.mockReset();
    getUser.mockReset();
    single.mockReset();
    getUser.mockResolvedValue({ data: { user: { id: "user-1" } }, error: null });
    single.mockResolvedValue({ data: { default_currency: "ILS" }, error: null });
    rpc.mockImplementation((name: string, args: { p_payload?: { idempotency_key?: string } }) => {
      if (name === "create_ai_text_intake") {
        return Promise.resolve({
          data: { item_id: `item-${args.p_payload?.idempotency_key}`, version: 1 },
          error: null,
        });
      }
      if (name === "commit_ai_intake_items") {
        return Promise.resolve({ data: { transaction_ids: ["tx-1"] }, error: null });
      }
      return Promise.resolve({ data: null, error: null });
    });
  });

  it("sends one key from two overlapping saves and returns one transaction", async () => {
    const [first, second] = await Promise.all([
      saveTextDraft(draft, "same-key"),
      saveTextDraft(draft, "same-key"),
    ]);
    const keys = rpc.mock.calls
      .filter((call) => call[0] === "create_ai_text_intake")
      .map((call) => call[1].p_payload.idempotency_key);
    expect(keys).toEqual(["same-key", "same-key"]);
    expect(first).toMatchObject({ ok: true, transactionId: "tx-1" });
    expect(second).toMatchObject({ ok: true, transactionId: "tx-1" });
  });
});
