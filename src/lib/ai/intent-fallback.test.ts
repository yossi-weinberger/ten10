import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/lib/ai/flags", () => ({ aiCallsAllowed: () => true }));

import { classifyIntentFallback } from "./intent-fallback";

beforeEach(() => invoke.mockReset());

describe("classifyIntentFallback", () => {
  it("carries the count next to the intent", async () => {
    invoke.mockResolvedValue({
      data: { intent: "add_transaction", confidence: 0.9, count: "several", count_confidence: 0.8 },
      error: null,
    });
    await expect(classifyIntentFallback("x")).resolves.toEqual({
      ok: true,
      intent: "add_transaction",
      confidence: 0.9,
      count: "several",
      countConfidence: 0.8,
    });
  });

  it("drops a count outside the closed set and its confidence with it", async () => {
    invoke.mockResolvedValue({
      data: { intent: "add_transaction", confidence: 0.9, count: "two", count_confidence: 0.8 },
      error: null,
    });
    const result = await classifyIntentFallback("x");
    expect(result).toMatchObject({ ok: true, count: null, countConfidence: null });
  });

  it("reads a missing count as null", async () => {
    invoke.mockResolvedValue({ data: { intent: "help", confidence: 0.9 }, error: null });
    const result = await classifyIntentFallback("x");
    expect(result).toMatchObject({ ok: true, intent: "help", count: null, countConfidence: null });
  });
});
