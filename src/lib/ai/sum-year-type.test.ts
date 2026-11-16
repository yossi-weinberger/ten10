import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ai/flags", () => ({ aiCallsAllowed: () => true }));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    rpc: async () => ({ data: { total: 1200, count: 12, max_amount: 100, currencies: ["ILS"] }, error: null }),
    from: () => ({
      select: () => ({ order: () => ({ limit: async () => ({ data: [{ date: "2026-01-01" }], error: null }) }) }),
    }),
  },
}));

import { sumYearType } from "./sum-year-type";
import type { YearTypeSum } from "@/lib/ai/classify-intake";

describe("sumYearType", () => {
  it("averages all time over the months since the first transaction, not since 2000", async () => {
    const question = {
      year: 2000,
      month: null,
      type: "donation",
      measure: "average",
      months: 324,
      paymentMethod: null,
      topic: null,
      recipient: null,
      from: "2000-01-01",
      to: "2026-12-31",
    } as unknown as YearTypeSum;

    const result = await sumYearType(question, { category: null, description: null, recipient: null } as never);

    expect(result).toMatchObject({ ok: true, total: 100 });
  });
});
