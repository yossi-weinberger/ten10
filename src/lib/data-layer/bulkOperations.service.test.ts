import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGetPlatform = vi.fn();
const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockSetLastDbFetchTimestamp = vi.fn();
const mockClearPaymentMethodCache = vi.fn();

vi.mock("../platformManager", () => ({ getPlatform: () => mockGetPlatform() }));
vi.mock("@/lib/supabaseClient", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));
vi.mock("../store", () => ({
  useDonationStore: {
    getState: () => ({
      setLastDbFetchTimestamp: mockSetLastDbFetchTimestamp,
    }),
  },
}));
vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: vi.fn(),
}));
vi.mock("./paymentMethods.service", () => ({
  clearPaymentMethodCache: () => mockClearPaymentMethodCache(),
}));
vi.mock("@tauri-apps/api/core", () => ({ invoke: vi.fn() }));

import { invoke } from "@tauri-apps/api/core";
import {
  bulkDeleteTransactions,
  bulkUpdateTransactions,
} from "./transactions.service";
import {
  bulkDeleteRecurringTransactions,
  bulkUpdateRecurringTransactions,
} from "./recurringTransactions.service";

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
    error: null,
  });
});

describe("transaction bulk data-layer operations", () => {
  it("calls the web bulk update RPC with authenticated user params and updates timestamp once", async () => {
    mockGetPlatform.mockReturnValue("web");
    mockRpc.mockResolvedValue({ data: 2, error: null });

    await bulkUpdateTransactions(["t1", "t2"], {
      kind: "transaction",
      field: "payment_method",
      value: " Credit card ",
    });

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith("bulk_update_user_transactions", {
      p_user_id: "user-1",
      p_ids: ["t1", "t2"],
      p_field: "payment_method",
      p_value: "credit_card",
    });
    expect(mockSetLastDbFetchTimestamp).toHaveBeenCalledTimes(1);
    expect(mockClearPaymentMethodCache).toHaveBeenCalledTimes(1);
  });

  it("calls the desktop bulk delete handler once and verifies the affected count", async () => {
    mockGetPlatform.mockReturnValue("desktop");
    vi.mocked(invoke).mockResolvedValue(2);

    await bulkDeleteTransactions(["t1", "t2"]);

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith("bulk_delete_transactions_handler", {
      ids: ["t1", "t2"],
    });
    expect(mockSetLastDbFetchTimestamp).toHaveBeenCalledTimes(1);
    expect(mockClearPaymentMethodCache).toHaveBeenCalledTimes(1);
  });

  it("throws when the affected count does not match the requested ids", async () => {
    mockGetPlatform.mockReturnValue("web");
    mockRpc.mockResolvedValue({ data: 1, error: null });

    await expect(bulkDeleteTransactions(["t1", "t2"])).rejects.toThrow(
      "Expected to affect 2 transactions, affected 1",
    );
    expect(mockSetLastDbFetchTimestamp).not.toHaveBeenCalled();
  });

  it("throws the RPC error without updating timestamp", async () => {
    mockGetPlatform.mockReturnValue("web");
    const rpcError = new Error("rls denied");
    mockRpc.mockResolvedValue({ data: null, error: rpcError });

    await expect(bulkDeleteTransactions(["t1"])).rejects.toThrow("rls denied");
    expect(mockSetLastDbFetchTimestamp).not.toHaveBeenCalled();
  });

  it("rejects empty and duplicate ids before dispatching", async () => {
    mockGetPlatform.mockReturnValue("web");

    await expect(bulkDeleteTransactions([])).rejects.toThrow(
      "Bulk action requires at least one id",
    );
    await expect(bulkDeleteTransactions(["t1", "t1"])).rejects.toThrow(
      "Bulk action ids must be unique",
    );
    expect(mockGetUser).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });

  it("rejects oversized category values before dispatching", async () => {
    mockGetPlatform.mockReturnValue("web");

    await expect(
      bulkUpdateTransactions(["t1"], {
        kind: "transaction",
        field: "category",
        value: "a".repeat(51),
      }),
    ).rejects.toThrow("50 character limit");
    expect(mockRpc).not.toHaveBeenCalled();
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe("recurring transaction bulk data-layer operations", () => {
  it("calls the web recurring bulk delete RPC with authenticated user params and updates timestamp once", async () => {
    mockGetPlatform.mockReturnValue("web");
    mockRpc.mockResolvedValue({ data: 2, error: null });

    await bulkDeleteRecurringTransactions(["r1", "r2"]);

    expect(mockRpc).toHaveBeenCalledTimes(1);
    expect(mockRpc).toHaveBeenCalledWith(
      "bulk_delete_user_recurring_transactions",
      {
        p_user_id: "user-1",
        p_ids: ["r1", "r2"],
      },
    );
    expect(mockSetLastDbFetchTimestamp).toHaveBeenCalledTimes(1);
    expect(mockClearPaymentMethodCache).toHaveBeenCalledTimes(1);
  });

  it("calls the desktop recurring bulk update handler with field and value and updates timestamp once", async () => {
    mockGetPlatform.mockReturnValue("desktop");
    vi.mocked(invoke).mockResolvedValue(2);

    await bulkUpdateRecurringTransactions(["r1", "r2"], {
      kind: "recurring",
      field: "payment_method",
      value: " כרטיס אשראי ",
    });

    expect(invoke).toHaveBeenCalledTimes(1);
    expect(invoke).toHaveBeenCalledWith(
      "bulk_update_recurring_transactions_handler",
      {
        ids: ["r1", "r2"],
        field: "payment_method",
        value: "credit_card",
      },
    );
    expect(mockSetLastDbFetchTimestamp).toHaveBeenCalledTimes(1);
    expect(mockClearPaymentMethodCache).toHaveBeenCalledTimes(1);
  });

  it("does not update timestamp when recurring affected count mismatches", async () => {
    mockGetPlatform.mockReturnValue("web");
    mockRpc.mockResolvedValue({ data: 1, error: null });

    await expect(bulkDeleteRecurringTransactions(["r1", "r2"])).rejects.toThrow(
      "Expected to affect 2 recurring transactions, affected 1",
    );
    expect(mockSetLastDbFetchTimestamp).not.toHaveBeenCalled();
  });

  it("does not update timestamp when recurring RPC fails", async () => {
    mockGetPlatform.mockReturnValue("web");
    mockRpc.mockResolvedValue({ data: null, error: new Error("rls denied") });

    await expect(bulkUpdateRecurringTransactions(["r1"], {
      kind: "recurring",
      field: "payment_method",
      value: "card",
    })).rejects.toThrow("rls denied");
    expect(mockSetLastDbFetchTimestamp).not.toHaveBeenCalled();
  });

  it("rejects oversized recurring category values before dispatching", async () => {
    mockGetPlatform.mockReturnValue("desktop");

    await expect(
      bulkUpdateRecurringTransactions(["r1"], {
        kind: "recurring",
        field: "category",
        value: "a".repeat(51),
      }),
    ).rejects.toThrow("50 character limit");
    expect(invoke).not.toHaveBeenCalled();
    expect(mockRpc).not.toHaveBeenCalled();
  });
});
