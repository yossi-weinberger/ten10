import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFetchTransactions = vi.fn();
const mockDeleteTransactionsBulk = vi.fn();
const mockUpdateTransactionsBulk = vi.fn();
const mockFetchAllRecurring = vi.fn();
const mockDeleteRecurringBulk = vi.fn();
const mockUpdateRecurringBulk = vi.fn();

vi.mock("./tableTransactionService", () => ({
  TableTransactionsService: {
    fetchTransactions: (...args: unknown[]) => mockFetchTransactions(...args),
    deleteTransactionsBulk: (...args: unknown[]) =>
      mockDeleteTransactionsBulk(...args),
    updateTransactionsBulk: (...args: unknown[]) =>
      mockUpdateTransactionsBulk(...args),
  },
}));
vi.mock("./recurringTable.service", () => ({
  fetchAllRecurring: (...args: unknown[]) => mockFetchAllRecurring(...args),
  deleteRecurringBulk: (...args: unknown[]) => mockDeleteRecurringBulk(...args),
  updateRecurringBulk: (...args: unknown[]) => mockUpdateRecurringBulk(...args),
}));
vi.mock("../utils/export-pdf", () => ({ exportTransactionsToPDF: vi.fn() }));
vi.mock("../utils/export-excel", () => ({ exportTransactionsToExcel: vi.fn() }));
vi.mock("../utils/export-csv", () => ({ exportTransactionsToCSV: vi.fn() }));
vi.mock("../i18n", () => ({ default: { language: "en" } }));
vi.mock("@/lib/logger", () => ({
  logger: { log: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: vi.fn(),
}));

import { useRecurringTableStore } from "./recurringTable.store";
import { useTableTransactionsStore } from "./tableTransactions.store";

function createDeferred(): {
  promise: Promise<void>;
  resolve: () => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: () => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<void>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockFetchTransactions.mockResolvedValue({ data: [], totalCount: 0 });
  mockFetchAllRecurring.mockResolvedValue([]);
  mockDeleteTransactionsBulk.mockResolvedValue(undefined);
  mockUpdateTransactionsBulk.mockResolvedValue(undefined);
  mockDeleteRecurringBulk.mockResolvedValue(undefined);
  mockUpdateRecurringBulk.mockResolvedValue(undefined);
  useTableTransactionsStore.getState().resetStore();
  useRecurringTableStore.getState().resetStore();
});

describe("table transaction bulk store actions", () => {
  it("deletes in one service call and refreshes once without optimistic state", async () => {
    await useTableTransactionsStore
      .getState()
      .deleteTransactionsBulk(["t1", "t2"], "web");

    expect(mockDeleteTransactionsBulk).toHaveBeenCalledTimes(1);
    expect(mockDeleteTransactionsBulk).toHaveBeenCalledWith(["t1", "t2"], "web");
    expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    expect(useTableTransactionsStore.getState().bulkLoading).toBe(false);
    expect(useTableTransactionsStore.getState().bulkError).toBeNull();
  });

  it("stores and rethrows bulk errors without refreshing", async () => {
    mockUpdateTransactionsBulk.mockRejectedValue(new Error("bulk failed"));

    await expect(
      useTableTransactionsStore.getState().updateTransactionsBulk(
        ["t1"],
        { kind: "transaction", field: "category", value: "salary" },
        "web",
      ),
    ).rejects.toThrow("bulk failed");

    expect(mockFetchTransactions).not.toHaveBeenCalled();
    expect(useTableTransactionsStore.getState().bulkLoading).toBe(false);
    expect(useTableTransactionsStore.getState().bulkError).toBe("bulk failed");
  });

  it("rejects a second transaction bulk delete while the first is pending", async () => {
    const pendingDelete = createDeferred();
    mockDeleteTransactionsBulk.mockReturnValueOnce(pendingDelete.promise);

    const firstCall = useTableTransactionsStore
      .getState()
      .deleteTransactionsBulk(["t1"], "web");
    const secondCall = useTableTransactionsStore
      .getState()
      .deleteTransactionsBulk(["t2"], "web");

    await expect(secondCall).rejects.toThrow("Bulk action already in progress");
    expect(mockDeleteTransactionsBulk).toHaveBeenCalledTimes(1);
    expect(mockFetchTransactions).not.toHaveBeenCalled();

    pendingDelete.resolve();
    await firstCall;

    expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    expect(useTableTransactionsStore.getState().bulkLoading).toBe(false);
  });

  it("rejects a second transaction bulk update while the first is pending", async () => {
    const pendingUpdate = createDeferred();
    mockUpdateTransactionsBulk.mockReturnValueOnce(pendingUpdate.promise);

    const firstCall = useTableTransactionsStore
      .getState()
      .updateTransactionsBulk(
        ["t1"],
        { kind: "transaction", field: "category", value: "salary" },
        "web",
      );
    const secondCall = useTableTransactionsStore
      .getState()
      .updateTransactionsBulk(
        ["t2"],
        { kind: "transaction", field: "payment_method", value: "card" },
        "web",
      );

    await expect(secondCall).rejects.toThrow("Bulk action already in progress");
    expect(mockUpdateTransactionsBulk).toHaveBeenCalledTimes(1);
    expect(mockFetchTransactions).not.toHaveBeenCalled();

    pendingUpdate.resolve();
    await firstCall;

    expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    expect(useTableTransactionsStore.getState().bulkLoading).toBe(false);
  });
});

describe("recurring transaction bulk store actions", () => {
  it("deletes recurring rows in one service call and refreshes once", async () => {
    await useRecurringTableStore
      .getState()
      .deleteRecurringBulk(["r1", "r2"]);

    expect(mockDeleteRecurringBulk).toHaveBeenCalledTimes(1);
    expect(mockDeleteRecurringBulk).toHaveBeenCalledWith(["r1", "r2"]);
    expect(mockFetchAllRecurring).toHaveBeenCalledTimes(1);
    expect(useRecurringTableStore.getState().bulkLoading).toBe(false);
    expect(useRecurringTableStore.getState().bulkError).toBeNull();
  });

  it("rejects a second recurring bulk delete while the first is pending", async () => {
    const pendingDelete = createDeferred();
    mockDeleteRecurringBulk.mockReturnValueOnce(pendingDelete.promise);

    const firstCall = useRecurringTableStore
      .getState()
      .deleteRecurringBulk(["r1"]);
    const secondCall = useRecurringTableStore
      .getState()
      .deleteRecurringBulk(["r2"]);

    await expect(secondCall).rejects.toThrow("Bulk action already in progress");
    expect(mockDeleteRecurringBulk).toHaveBeenCalledTimes(1);
    expect(mockFetchAllRecurring).not.toHaveBeenCalled();

    pendingDelete.resolve();
    await firstCall;

    expect(mockFetchAllRecurring).toHaveBeenCalledTimes(1);
    expect(useRecurringTableStore.getState().bulkLoading).toBe(false);
  });

  it("rejects a second recurring bulk update while the first is pending", async () => {
    const pendingUpdate = createDeferred();
    mockUpdateRecurringBulk.mockReturnValueOnce(pendingUpdate.promise);

    const firstCall = useRecurringTableStore
      .getState()
      .updateRecurringBulk(["r1"], {
        kind: "recurring",
        field: "status",
        value: "paused",
      });
    const secondCall = useRecurringTableStore
      .getState()
      .updateRecurringBulk(["r2"], {
        kind: "recurring",
        field: "payment_method",
        value: "card",
      });

    await expect(secondCall).rejects.toThrow("Bulk action already in progress");
    expect(mockUpdateRecurringBulk).toHaveBeenCalledTimes(1);
    expect(mockFetchAllRecurring).not.toHaveBeenCalled();

    pendingUpdate.resolve();
    await firstCall;

    expect(mockFetchAllRecurring).toHaveBeenCalledTimes(1);
    expect(useRecurringTableStore.getState().bulkLoading).toBe(false);
  });
});
