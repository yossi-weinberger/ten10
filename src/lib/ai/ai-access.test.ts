import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mockRpc = vi.fn();
const mockGetSession = vi.fn();
const mockInvoke = vi.fn();
const getPlatform = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    functions: {
      invoke: (...args: unknown[]) => mockInvoke(...args),
    },
  },
}));

vi.mock("@/lib/platformManager", () => ({
  getPlatform: () => getPlatform(),
}));

import { loadAiAccess } from "./ai-access";
import {
  clearAiAccessCache,
  isCachedAiAccessAllowed,
  setCachedAiAccessForTests,
} from "./ai-access-cache";
import { splitItems } from "./split-items";

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockReset();
  mockGetSession.mockReset();
  mockInvoke.mockReset();
  getPlatform.mockReset();
  getPlatform.mockReturnValue("web");
  clearAiAccessCache();
  vi.stubEnv("VITE_AI_INTAKE_ENABLED", "true");
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: "user-1" } } },
  });
});

afterEach(() => {
  clearAiAccessCache();
  vi.unstubAllEnvs();
});

describe("AI access cache", () => {
  it("calls get_my_ai_access once per user and treats allowed as the UI/network gate", async () => {
    mockRpc.mockResolvedValue({ data: { allowed: true, plan: "beta" }, error: null });
    expect(isCachedAiAccessAllowed()).toBe(false);
    await loadAiAccess();
    await loadAiAccess();
    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("get_my_ai_access");
    expect(isCachedAiAccessAllowed()).toBe(true);
  });

  it("hides access when the RPC says the user is not allowed", async () => {
    mockRpc.mockResolvedValue({ data: { allowed: false, plan: null }, error: null });
    await loadAiAccess();
    expect(isCachedAiAccessAllowed()).toBe(false);
  });

  it("resets on user switch so the next user cannot keep the previous plan", async () => {
    mockRpc.mockResolvedValue({ data: { allowed: true, plan: "beta" }, error: null });
    await loadAiAccess();
    expect(isCachedAiAccessAllowed()).toBe(true);
    clearAiAccessCache();
    expect(isCachedAiAccessAllowed()).toBe(false);
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "user-2" } } },
    });
    mockRpc.mockResolvedValue({ data: { allowed: false, plan: null }, error: null });
    await loadAiAccess();
    expect(mockRpc).toHaveBeenCalledTimes(2);
    expect(isCachedAiAccessAllowed()).toBe(false);
  });

  it("does not make AI network calls when the user has no plan", async () => {
    setCachedAiAccessForTests("user-1", false);
    await expect(splitItems("coffee 12", "2026-11-09")).resolves.toEqual({
      ok: false,
      reason: "UNAVAILABLE",
    });
    expect(mockInvoke).not.toHaveBeenCalled();
  });
});
