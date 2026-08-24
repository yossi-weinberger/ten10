import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRpc = vi.fn();
const mockSetLastDbFetchTimestamp = vi.fn();
const mockClearPaymentMethodCache = vi.fn();

vi.mock("../../platformManager", () => ({
  getPlatform: () => "web",
}));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));
vi.mock("../../store", () => ({
  useDonationStore: {
    getState: () => ({
      setLastDbFetchTimestamp: mockSetLastDbFetchTimestamp,
    }),
  },
}));
vi.mock("../paymentMethods.service", () => ({
  clearPaymentMethodCache: () => mockClearPaymentMethodCache(),
}));
vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { clearAllData } from "./clear";

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ error: null });
});

describe("clearAllData payment method cache", () => {
  it("invalidates cached payment methods after clearing persisted data", async () => {
    await clearAllData();

    expect(mockRpc).toHaveBeenCalledWith("clear_all_user_data");
    expect(mockClearPaymentMethodCache).toHaveBeenCalledTimes(1);
  });
});
