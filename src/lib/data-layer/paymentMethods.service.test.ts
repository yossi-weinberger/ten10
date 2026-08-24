import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRpc = vi.fn();
const mockGetSession = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));
vi.mock("../platformManager", () => ({
  getPlatform: () => "web",
}));
vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import {
  clearPaymentMethodCache,
  getUserPaymentMethods,
} from "./paymentMethods.service";

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockReset();
  mockGetSession.mockReset();
  clearPaymentMethodCache();
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: "user-1" } } },
  });
});

describe("payment method cache invalidation", () => {
  it("does not cache a failed Web fetch", async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: new Error("temporary"),
      })
      .mockResolvedValueOnce({
        data: [{ payment_method: "Fresh card" }],
        error: null,
      });

    await expect(getUserPaymentMethods()).rejects.toThrow("temporary");
    await expect(getUserPaymentMethods()).resolves.toEqual(["Fresh card"]);
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("caches a successful empty Web response", async () => {
    mockRpc.mockResolvedValue({
      data: [],
      error: null,
    });

    await expect(getUserPaymentMethods()).resolves.toEqual([]);
    await expect(getUserPaymentMethods()).resolves.toEqual([]);
    expect(mockRpc).toHaveBeenCalledOnce();
  });

  it("does not return or cache a stale fetch resolved after invalidation", async () => {
    const staleResponse = deferred<{
      data: Array<{ payment_method: string }>;
      error: null;
    }>();
    mockRpc.mockReturnValueOnce(staleResponse.promise);

    const staleRequest = getUserPaymentMethods();
    await vi.waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(1));

    clearPaymentMethodCache();
    staleResponse.resolve({
      data: [{ payment_method: "Stale card" }],
      error: null,
    });

    await expect(staleRequest).resolves.toEqual([]);

    mockRpc.mockResolvedValueOnce({
      data: [{ payment_method: "Fresh card" }],
      error: null,
    });
    await expect(getUserPaymentMethods()).resolves.toEqual(["Fresh card"]);
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });

  it("returns a newer cached value instead of an invalidated fetch result", async () => {
    const staleResponse = deferred<{
      data: Array<{ payment_method: string }>;
      error: null;
    }>();
    mockRpc.mockReturnValueOnce(staleResponse.promise);

    const staleRequest = getUserPaymentMethods();
    await vi.waitFor(() => expect(mockRpc).toHaveBeenCalledTimes(1));
    clearPaymentMethodCache();

    mockRpc.mockResolvedValueOnce({
      data: [{ payment_method: "Fresh card" }],
      error: null,
    });
    await expect(getUserPaymentMethods()).resolves.toEqual(["Fresh card"]);

    staleResponse.resolve({
      data: [{ payment_method: "Stale card" }],
      error: null,
    });
    await expect(staleRequest).resolves.toEqual(["Fresh card"]);
    await expect(getUserPaymentMethods()).resolves.toEqual(["Fresh card"]);
    expect(mockRpc).toHaveBeenCalledTimes(2);
  });
});
