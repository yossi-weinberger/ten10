import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { rpc: vi.fn() },
}));

import { readDuplicateCandidates } from "./duplicate-candidates";

describe("readDuplicateCandidates", () => {
  it("keeps dated amounts and drops broken rows", () => {
    expect(readDuplicateCandidates([
      { date: "2026-10-19", amount: 15, description: "מאפים" },
      { date: "2026-10-18", amount: "12.5", description: null },
      { amount: 10 },
    ])).toEqual([
      { date: "2026-10-19", amount: 15, description: "מאפים" },
      { date: "2026-10-18", amount: 12.5, description: "" },
    ]);
  });
});
