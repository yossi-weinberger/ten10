import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialTableTransactionFilters } from "./tableTransactions.types";

const mockGetUser = vi.fn();
const mockRpc = vi.fn();
const mockInvokeDesktopFilteredTransactions = vi.fn();
const mockGetUserPaymentMethods = vi.fn();

vi.mock("../supabaseClient", () => ({
  supabase: {
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}));
vi.mock("../data-layer", () => ({
  updateTransaction: vi.fn(),
  deleteTransaction: vi.fn(),
}));
vi.mock("../data-layer/transactions.service", () => ({
  bulkDeleteTransactions: vi.fn(),
  bulkUpdateTransactions: vi.fn(),
}));
vi.mock("../data-layer/paymentMethods.service", () => ({
  getUserPaymentMethods: (...args: unknown[]) =>
    mockGetUserPaymentMethods(...args),
}));
vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("./desktop-filtered-transactions-invoke", () => ({
  invokeDesktopFilteredTransactions: (
    ...args: unknown[]
  ) => mockInvokeDesktopFilteredTransactions(...args),
}));

import { TableTransactionsService } from "./tableTransactionService";

const filters = {
  ...initialTableTransactionFilters,
  dateRange: { ...initialTableTransactionFilters.dateRange },
  paymentMethods: ["credit_card"],
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
  mockRpc.mockResolvedValue({
    data: { transactions: [], total_count: 0 },
    error: null,
  });
  mockInvokeDesktopFilteredTransactions.mockResolvedValue({
    transactions: [],
    totalCount: 0,
  });
  mockGetUserPaymentMethods.mockResolvedValue([
    "CREDIT CARD",
    " CrEdIt CaRd ",
    "Cash",
  ]);
});

describe("TableTransactionsService payment method compatibility", () => {
  it("sends expanded payment method aliases to the web RPC", async () => {
    await TableTransactionsService.fetchTransactions({
      offset: 0,
      limit: 20,
      filters,
      sorting: { field: "date", direction: "desc" },
      platform: "web",
    });

    expect(mockRpc).toHaveBeenCalledWith(
      "get_user_transactions",
      expect.objectContaining({
        p_payment_methods: [
          "credit_card",
          "Credit card",
          "כרטיס אשראי",
          "CREDIT CARD",
          " CrEdIt CaRd ",
        ],
      }),
    );
  });

  it("sends expanded payment method aliases to the desktop query", async () => {
    await TableTransactionsService.fetchTransactions({
      offset: 0,
      limit: 20,
      filters,
      sorting: { field: "date", direction: "desc" },
      platform: "desktop",
    });

    expect(mockInvokeDesktopFilteredTransactions).toHaveBeenCalledWith(
      expect.objectContaining({
        filters: expect.objectContaining({
          paymentMethods: [
            "credit_card",
            "Credit card",
            "כרטיס אשראי",
            "CREDIT CARD",
            " CrEdIt CaRd ",
          ],
        }),
      }),
    );
  });

  it("does not fetch observed methods without a payment method filter", async () => {
    await TableTransactionsService.fetchTransactions({
      offset: 0,
      limit: 20,
      filters: { ...filters, paymentMethods: [] },
      sorting: { field: "date", direction: "desc" },
      platform: "web",
    });

    expect(mockGetUserPaymentMethods).not.toHaveBeenCalled();
    expect(mockRpc).toHaveBeenCalledWith(
      "get_user_transactions",
      expect.objectContaining({ p_payment_methods: null }),
    );
  });

  it("falls back to official aliases when observed method retrieval fails", async () => {
    mockGetUserPaymentMethods.mockRejectedValueOnce(new Error("Unavailable"));

    await TableTransactionsService.fetchTransactions({
      offset: 0,
      limit: 20,
      filters,
      sorting: { field: "date", direction: "desc" },
      platform: "web",
    });

    expect(mockGetUserPaymentMethods).toHaveBeenCalledOnce();
    expect(mockRpc).toHaveBeenCalledWith(
      "get_user_transactions",
      expect.objectContaining({
        p_payment_methods: [
          "credit_card",
          "Credit card",
          "כרטיס אשראי",
        ],
      }),
    );
  });
});
