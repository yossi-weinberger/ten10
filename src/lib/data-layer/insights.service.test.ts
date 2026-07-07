import { describe, it, expect, vi, beforeEach } from "vitest";

// Regression test for the fetchByPlatform() extraction: verifies the shared
// shell still dispatches to the right implementation, propagates errors, and
// falls back correctly when the platform can't be determined — exercised
// through the public fetchActiveRecurring() API rather than the private helper.
const mockGetPlatform = vi.fn();
vi.mock("../platformManager", () => ({ getPlatform: () => mockGetPlatform() }));

const mockRpcEq = vi.fn();
vi.mock("@/lib/supabaseClient", () => ({
  supabase: { from: () => ({ select: () => ({ eq: (...args: unknown[]) => mockRpcEq(...args) }) }) },
}));

vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { fetchActiveRecurring } from "./insights.service";
import { invoke } from "@tauri-apps/api/core";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("fetchByPlatform (via fetchActiveRecurring)", () => {
  it("calls the web implementation when platform is web", async () => {
    mockGetPlatform.mockReturnValue("web");
    mockRpcEq.mockResolvedValue({ data: [{ id: "r1" }], error: null });
    const result = await fetchActiveRecurring();
    expect(result).toEqual([{ id: "r1" }]);
    expect(invoke).not.toHaveBeenCalled();
  });

  it("calls the desktop implementation when platform is desktop", async () => {
    mockGetPlatform.mockReturnValue("desktop");
    vi.mocked(invoke).mockResolvedValue([{ id: "r2" }]);
    const result = await fetchActiveRecurring();
    expect(result).toEqual([{ id: "r2" }]);
    expect(mockRpcEq).not.toHaveBeenCalled();
  });

  it("returns the fallback when the platform is undetermined", async () => {
    mockGetPlatform.mockReturnValue("loading");
    const result = await fetchActiveRecurring();
    expect(result).toEqual([]);
    expect(invoke).not.toHaveBeenCalled();
    expect(mockRpcEq).not.toHaveBeenCalled();
  });

  it("propagates (does not swallow) errors from the platform implementation", async () => {
    mockGetPlatform.mockReturnValue("web");
    mockRpcEq.mockResolvedValue({ data: null, error: new Error("boom") });
    await expect(fetchActiveRecurring()).rejects.toThrow();
  });
});
