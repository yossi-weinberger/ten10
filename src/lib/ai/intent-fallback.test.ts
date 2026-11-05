import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/lib/ai/flags", () => ({ aiCallsAllowed: () => true }));

import { classifyIntentFallback } from "./intent-fallback";

beforeEach(() => invoke.mockReset());

describe("classifyIntentFallback", () => {
  it("reads the intent, confidence, and optional halacha page", async () => {
    invoke.mockResolvedValue({
      data: { intent: "add_transaction", confidence: 0.9, halacha_page: "tithes", halacha_page_confidence: 0.8 },
      error: null,
    });
    await expect(classifyIntentFallback("x")).resolves.toEqual({
      ok: true,
      intent: "add_transaction",
      confidence: 0.9,
      halachaPage: "tithes",
      halachaPageConfidence: 0.8,
      chomesh: false,
    });
  });

  it("reads Jev's chomesh answer", async () => {
    invoke.mockResolvedValue({ data: { intent: "add_transaction", confidence: 0.9, chomesh: true }, error: null });
    await expect(classifyIntentFallback("x")).resolves.toMatchObject({ ok: true, chomesh: true });
  });

  it("drops an intent outside the closed set", async () => {
    invoke.mockResolvedValue({
      data: { intent: "unknown_intent", confidence: 0.9, halacha_page: "tithes", halacha_page_confidence: 0.8 },
      error: null,
    });
    const result = await classifyIntentFallback("x");
    expect(result).toEqual({
      ok: true,
      intent: null,
      confidence: null,
      halachaPage: null,
      halachaPageConfidence: null,
    });
  });

  it("treats an out-of-range confidence as null", async () => {
    invoke.mockResolvedValue({ data: { intent: "help", confidence: 1.5 }, error: null });
    const result = await classifyIntentFallback("x");
    expect(result).toEqual({
      ok: true,
      intent: "help",
      confidence: null,
      halachaPage: null,
      halachaPageConfidence: null,
      chomesh: false,
    });
  });
});
