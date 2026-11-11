import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabaseClient", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/lib/ai/flags", () => ({ aiCallsAllowed: () => true }));

import { onBetaConsentRequired } from "./beta-consent-required";
import { classifyIntentFallback } from "./intent-fallback";

function consentError(): { context: Response } {
  return {
    context: new Response(JSON.stringify({
      error: "beta_consent_required",
      code: "beta_consent_required",
    }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    }),
  };
}

beforeEach(() => invoke.mockReset());

describe("beta consent client mapping", () => {
  it("maps a beta_consent_required edge error onto the consent dialog", async () => {
    const opened: string[] = [];
    const stop = onBetaConsentRequired(() => opened.push("dialog"));
    invoke.mockResolvedValue({ data: null, error: consentError() });

    await expect(classifyIntentFallback("קניתי לחם")).resolves.toEqual({
      ok: false,
      reason: "BETA_CONSENT",
    });
    expect(opened).toEqual(["dialog"]);
    stop();
  });

  it("leaves a generic function error as unavailable and does not open the dialog", async () => {
    const opened: string[] = [];
    const stop = onBetaConsentRequired(() => opened.push("dialog"));
    invoke.mockResolvedValue({
      data: null,
      error: { context: new Response(JSON.stringify({ error: "nope" }), { status: 500 }) },
    });

    await expect(classifyIntentFallback("קניתי לחם")).resolves.toEqual({
      ok: false,
      reason: "UNAVAILABLE",
    });
    expect(opened).toEqual([]);
    stop();
  });
});
