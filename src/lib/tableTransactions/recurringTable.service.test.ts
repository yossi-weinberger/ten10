import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecurringTableFilters } from "./recurringTable.store";

const mockGetUser = vi.fn();
const mockGetSession = vi.fn();
const mockRpc = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));
vi.mock("@/lib/platformManager", () => ({ getPlatform: () => "web" }));
vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: vi.fn(),
}));
vi.mock("@/lib/tauri-invoke", () => ({ invokeTauri: vi.fn() }));
vi.mock("@/lib/data-layer/recurringTransactions.service", () => ({
  bulkDeleteRecurringTransactions: vi.fn(),
  bulkUpdateRecurringTransactions: vi.fn(),
}));
vi.mock("@/lib/data-layer/paymentMethods.service", () => ({
  clearPaymentMethodCache: vi.fn(),
}));

import {
  deleteRecurringTransaction,
  fetchAllRecurring,
  updateRecurringTransaction,
} from "./recurringTable.service";

const sorting = { field: "next_due_date", direction: "asc" } as const;
const filters: RecurringTableFilters = {
  search: "",
  statuses: [],
  types: [],
  frequencies: [],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: null },
    error: new Error("Failed to fetch"),
  });
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: "user-1" } } },
    error: null,
  });
  mockRpc.mockImplementation(() => {
    const result = Promise.resolve({ data: [], error: null });
    return Object.assign(result, {
      select: () => ({
        single: () => Promise.resolve({ data: { id: "rec-1" }, error: null }),
      }),
    });
  });
});

describe("recurring table web user", () => {
  it("lists with the stored session when the auth server request fails", async () => {
    await fetchAllRecurring(sorting, filters);

    expect(mockRpc).toHaveBeenCalledWith(
      "get_user_recurring_transactions",
      expect.objectContaining({ p_user_id: "user-1" }),
    );
  });

  it("updates with the stored session when the auth server request fails", async () => {
    await updateRecurringTransaction("rec-1", { description: "Rent" });

    expect(mockRpc).toHaveBeenCalledWith(
      "update_recurring_transaction",
      expect.objectContaining({ p_user_id: "user-1" }),
    );
  });

  it("deletes with the stored session when the auth server request fails", async () => {
    await deleteRecurringTransaction("rec-1");

    expect(mockRpc).toHaveBeenCalledWith("delete_recurring_transaction", {
      p_id: "rec-1",
      p_user_id: "user-1",
    });
  });

  it("keeps the signed-out behavior when there is no session", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

    await expect(
      fetchAllRecurring(sorting, filters),
    ).resolves.toEqual([]);
    await expect(
      updateRecurringTransaction("rec-1", { description: "Rent" }),
    ).rejects.toThrow("User not authenticated for updating transaction");
    await expect(deleteRecurringTransaction("rec-1")).rejects.toThrow(
      "User not authenticated for deleting transaction",
    );
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
