import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

import { readDuplicateCandidates } from "./duplicate-candidates";

describe("readDuplicateCandidates", () => {
  it("keeps dated amounts and drops broken rows", () => {
    expect(readDuplicateCandidates([
      { id: "a", date: "2026-10-19", amount: 15, description: "מאפים", kind: "transaction" },
      { id: "b", date: "2026-10-18", amount: "12.5", description: null, kind: "draft" },
      { id: "c", date: "2026-10-17", amount: 10, kind: "other" },
    ])).toEqual([
      { id: "a", date: "2026-10-19", amount: 15, description: "מאפים", kind: "transaction" },
      { id: "b", date: "2026-10-18", amount: 12.5, description: "", kind: "draft" },
    ]);
  });
});
