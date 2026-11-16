import { beforeEach, describe, expect, it, vi } from "vitest";

/** A server that follows the SQL: items by idempotency key, commit once, reject only a ready item. */
const server = vi.hoisted(() => {
  const state = {
    items: new Map<string, { id: string; status: string; tx: string | null }>(),
    transactions: [] as string[],
    loseNextCommitReply: false,
    refuseNextCommit: false,
  };
  function item(key: string) {
    let found = state.items.get(key);
    if (!found) {
      found = { id: `item-${state.items.size + 1}`, status: "ready", tx: null };
      state.items.set(key, found);
    }
    return found;
  }
  function commit(ids: string[]) {
    if (state.refuseNextCommit) {
      state.refuseNextCommit = false;
      return { data: null, error: { message: "AMOUNT_MISMATCH" } };
    }
    const rows = [...state.items.values()].filter((row) => ids.includes(row.id));
    if (rows.some((row) => row.status !== "ready" && row.status !== "committed")) {
      return { data: null, error: { message: "DRAFT_NOT_READY" } };
    }
    const fresh: string[] = [];
    const already: string[] = [];
    for (const row of rows) {
      if (row.status === "committed") {
        already.push(row.tx!);
        continue;
      }
      row.status = "committed";
      row.tx = `tx-${state.transactions.length + 1}`;
      state.transactions.push(row.tx);
      fresh.push(row.tx);
    }
    if (state.loseNextCommitReply) {
      state.loseNextCommitReply = false;
      return { data: null, error: { message: "Failed to fetch" } };
    }
    return { data: { transaction_ids: fresh, already_committed: already }, error: null };
  }
  type Args = {
    p_payload: { idempotency_key: string; items: unknown[] };
    p_items: { id: string }[];
    p_item_id: string;
  };
  async function rpc(name: string, args: Args) {
    switch (name) {
      case "create_ai_text_intake": {
        const row = item(args.p_payload.idempotency_key);
        return { data: { item_id: row.id, version: 1 }, error: null };
      }
      case "create_ai_text_intake_items": {
        const rows = args.p_payload.items.map((_, index) => item(`${args.p_payload.idempotency_key}#${index}`));
        return { data: rows.map((row, index) => ({ item_id: row.id, version: 1, item_index: index })), error: null };
      }
      case "commit_ai_intake_items":
        return commit(args.p_items.map((row) => row.id));
      case "reject_uncommitted_ai_item": {
        const row = [...state.items.values()].find((candidate) => candidate.id === args.p_item_id);
        const rejected = row?.status === "ready";
        if (rejected) row!.status = "rejected";
        return { data: { rejected }, error: null };
      }
      default:
        return { data: null, error: null };
    }
  }
  return { state, rpc };
});

vi.mock("@/lib/ai/flags", () => ({ aiCallsAllowed: () => true }));
vi.mock("@/lib/services/exchange-rate.service", () => ({ ExchangeRateService: { fetchExchangeRate: vi.fn() } }));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: { getUser: async () => ({ data: { user: { id: "u1" } }, error: null }) },
    from: () => ({
      select: () => ({ eq: () => ({ single: async () => ({ data: { default_currency: "ILS" }, error: null }) }) }),
    }),
    rpc: server.rpc,
  },
}));

import { saveTextDraft } from "./save-text-draft";
import { saveSplitDrafts } from "./save-split-drafts";
import type { SplitDraft } from "./split-cards";

const draft = {
  date: "2026-11-03",
  amount: 100,
  currency: "ILS" as const,
  type: "expense" as const,
  requestedRate: null,
  description: "מכולת",
  category: null,
  paymentMethod: null,
  isChomesh: false,
};

beforeEach(() => {
  server.state.items.clear();
  server.state.transactions = [];
  server.state.loseNextCommitReply = false;
  server.state.refuseNextCommit = false;
});

describe("save after a lost commit reply", () => {
  it("keeps the key, so the retry finds the saved transaction instead of adding one", async () => {
    server.state.loseNextCommitReply = true;
    const first = await saveTextDraft(draft, "key-1");
    expect(first).toEqual({ ok: false, reason: "SAVE_FAILED" });

    const retry = await saveTextDraft(draft, "key-1");
    expect(retry).toMatchObject({ ok: true, transactionId: "tx-1" });
    expect(server.state.transactions).toEqual(["tx-1"]);
  });

  it("marks a confirmed reject, so only then the caller takes a new key", async () => {
    server.state.refuseNextCommit = true;
    expect(await saveTextDraft(draft, "key-2")).toEqual({ ok: false, reason: "SAVE_FAILED", rejected: true });
    expect(server.state.transactions).toEqual([]);
  });

  it("reports a split list as saved when the retry finds every row already committed", async () => {
    const card = (key: string): SplitDraft => ({
      key,
      description: key,
      amount: 10,
      currency: "ILS",
      date: "2026-11-01",
      type: "expense",
      category: null,
      paymentMethod: null,
      isChomesh: false,
      checked: true,
      transactionId: null,
      itemId: null,
    });
    server.state.loseNextCommitReply = true;
    expect(await saveSplitDrafts([card("a"), card("b")], "list-1")).toEqual({ ok: false, reason: "SAVE_FAILED" });

    const retry = await saveSplitDrafts([card("a"), card("b")], "list-1");
    expect(retry).toMatchObject({ ok: true, saved: [{ key: "a", transactionId: "tx-1" }, { key: "b", transactionId: "tx-2" }] });
    expect(server.state.transactions).toEqual(["tx-1", "tx-2"]);
  });
});
