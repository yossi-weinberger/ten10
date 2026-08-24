import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RecurringTransaction, Transaction } from "@/types/transaction";

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

function createDeferred<T = void>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason?: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
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
  it("keeps a plain-object fetch error message", async () => {
    mockFetchTransactions.mockRejectedValue({ message: "query failed" });

    await useTableTransactionsStore
      .getState()
      .fetchTransactions(true, "web");

    expect(useTableTransactionsStore.getState().error).toBe("query failed");
  });

  it("commits only the latest transaction fetch when requests resolve out of order", async () => {
    const older = createDeferred<{
      data: Transaction[];
      totalCount: number;
    }>();
    const newer = createDeferred<{
      data: Transaction[];
      totalCount: number;
    }>();
    mockFetchTransactions
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);

    useTableTransactionsStore.getState().setFilters({ search: "old" });
    const olderFetch = useTableTransactionsStore
      .getState()
      .fetchTransactions(true, "web");
    useTableTransactionsStore.getState().setFilters({ search: "new" });
    const newerFetch = useTableTransactionsStore
      .getState()
      .fetchTransactions(true, "web");

    newer.resolve({
      data: [{ id: "new" } as Transaction],
      totalCount: 1,
    });
    await newerFetch;
    older.resolve({
      data: [{ id: "old" } as Transaction],
      totalCount: 1,
    });
    await olderFetch;

    expect(
      useTableTransactionsStore.getState().transactions.map(({ id }) => id),
    ).toEqual(["new"]);
    expect(useTableTransactionsStore.getState().loading).toBe(false);
  });

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

  it.each([
    [
      "delete",
      mockDeleteTransactionsBulk,
      () =>
        useTableTransactionsStore
          .getState()
          .deleteTransactionsBulk(["t1"], "web"),
    ],
    [
      "update",
      mockUpdateTransactionsBulk,
      () =>
        useTableTransactionsStore.getState().updateTransactionsBulk(
          ["t1"],
          { kind: "transaction", field: "category", value: "salary" },
          "web",
        ),
    ],
  ])(
    "rejects transaction bulk %s mutation failures without refreshing",
    async (_operation, mutation, mutate) => {
      mutation.mockRejectedValue(new Error("bulk failed"));

      await expect(mutate()).rejects.toThrow("bulk failed");

      expect(mockFetchTransactions).not.toHaveBeenCalled();
      expect(useTableTransactionsStore.getState().bulkLoading).toBe(false);
      expect(useTableTransactionsStore.getState().bulkError).toBe("bulk failed");
    },
  );

  it("updates in one service call and refreshes once", async () => {
    const change = { kind: "transaction", field: "category", value: "salary" } as const;

    await useTableTransactionsStore
      .getState()
      .updateTransactionsBulk(["t1", "t2"], change, "web");

    expect(mockUpdateTransactionsBulk).toHaveBeenCalledTimes(1);
    expect(mockUpdateTransactionsBulk).toHaveBeenCalledWith(
      ["t1", "t2"],
      change,
      "web"
    );
    expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    expect(useTableTransactionsStore.getState().bulkLoading).toBe(false);
    expect(useTableTransactionsStore.getState().bulkError).toBeNull();
  });

  it.each([
    ["delete", () =>
      useTableTransactionsStore
        .getState()
        .deleteTransactionsBulk(["t1"], "web")],
    ["update", () =>
      useTableTransactionsStore.getState().updateTransactionsBulk(
        ["t1"],
        { kind: "transaction", field: "category", value: "salary" },
        "web",
      )],
  ])(
    "resolves transaction bulk %s with a warning when refresh fails",
    async (_operation, mutate) => {
      const refreshError = { message: "refresh failed" };
      mockFetchTransactions.mockRejectedValue(refreshError);

      await expect(mutate()).resolves.toEqual({
        refreshError: "refresh failed",
      });

      expect(useTableTransactionsStore.getState().error).toBe("refresh failed");
      expect(useTableTransactionsStore.getState().bulkError).toBeNull();
      expect(useTableTransactionsStore.getState().bulkLoading).toBe(false);
    },
  );

  it("restores transaction rows and pagination when a bulk refresh fails", async () => {
    const transactions = [
      { id: "t1", description: "First" } as Transaction,
      { id: "t2", description: "Second" } as Transaction,
    ];
    const pagination = {
      currentPage: 2,
      itemsPerPage: 20,
      totalCount: 35,
      hasMore: true,
    };
    useTableTransactionsStore.setState({
      transactions,
      pagination,
      totalCount: 35,
    });
    mockFetchTransactions.mockRejectedValue(new Error("refresh failed"));

    await useTableTransactionsStore
      .getState()
      .deleteTransactionsBulk(["t1"], "web");

    expect(useTableTransactionsStore.getState().transactions).toEqual(
      transactions,
    );
    expect(useTableTransactionsStore.getState().pagination).toEqual(pagination);
    expect(useTableTransactionsStore.getState().totalCount).toBe(35);
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

    pendingDelete.resolve(undefined);
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

    pendingUpdate.resolve(undefined);
    await firstCall;

    expect(mockFetchTransactions).toHaveBeenCalledTimes(1);
    expect(useTableTransactionsStore.getState().bulkLoading).toBe(false);
  });
});

describe("recurring transaction bulk store actions", () => {
  it("keeps a plain-object fetch error message", async () => {
    mockFetchAllRecurring.mockRejectedValue({ message: "query failed" });

    await useRecurringTableStore.getState().fetchRecurring();

    expect(useRecurringTableStore.getState().error).toBe("query failed");
  });

  it("commits only the latest recurring fetch when requests resolve out of order", async () => {
    const older = createDeferred<RecurringTransaction[]>();
    const newer = createDeferred<RecurringTransaction[]>();
    mockFetchAllRecurring
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);

    useRecurringTableStore.getState().setFilters({ search: "old" });
    const olderFetch = useRecurringTableStore.getState().fetchRecurring();
    useRecurringTableStore.getState().setFilters({ search: "new" });
    const newerFetch = useRecurringTableStore.getState().fetchRecurring();

    newer.resolve([{ id: "new" } as RecurringTransaction]);
    await newerFetch;
    older.resolve([{ id: "old" } as RecurringTransaction]);
    await olderFetch;

    expect(
      useRecurringTableStore.getState().recurring.map(({ id }) => id),
    ).toEqual(["new"]);
    expect(useRecurringTableStore.getState().loading).toBe(false);
  });

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

  it.each([
    [
      "delete",
      mockDeleteRecurringBulk,
      () =>
        useRecurringTableStore.getState().deleteRecurringBulk(["r1"]),
    ],
    [
      "update",
      mockUpdateRecurringBulk,
      () =>
        useRecurringTableStore.getState().updateRecurringBulk(["r1"], {
          kind: "recurring",
          field: "payment_method",
          value: "card",
        }),
    ],
  ])(
    "rejects recurring bulk %s mutation failures without refreshing",
    async (_operation, mutation, mutate) => {
      mutation.mockRejectedValue(new Error("bulk failed"));

      await expect(mutate()).rejects.toThrow("bulk failed");

      expect(mockFetchAllRecurring).not.toHaveBeenCalled();
      expect(useRecurringTableStore.getState().bulkLoading).toBe(false);
      expect(useRecurringTableStore.getState().bulkError).toBe("bulk failed");
    },
  );

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

    pendingDelete.resolve(undefined);
    await firstCall;

    expect(mockFetchAllRecurring).toHaveBeenCalledTimes(1);
    expect(useRecurringTableStore.getState().bulkLoading).toBe(false);
  });

  it("updates recurring rows in one service call and refreshes once", async () => {
    const change = {
      kind: "recurring",
      field: "payment_method",
      value: "card",
    } as const;

    await useRecurringTableStore
      .getState()
      .updateRecurringBulk(["r1", "r2"], change);

    expect(mockUpdateRecurringBulk).toHaveBeenCalledTimes(1);
    expect(mockUpdateRecurringBulk).toHaveBeenCalledWith(["r1", "r2"], change);
    expect(mockFetchAllRecurring).toHaveBeenCalledTimes(1);
    expect(useRecurringTableStore.getState().bulkLoading).toBe(false);
    expect(useRecurringTableStore.getState().bulkError).toBeNull();
  });

  it.each([
    ["delete", () =>
      useRecurringTableStore.getState().deleteRecurringBulk(["r1"])],
    ["update", () =>
      useRecurringTableStore.getState().updateRecurringBulk(["r1"], {
        kind: "recurring",
        field: "payment_method",
        value: "card",
      })],
  ])(
    "resolves recurring bulk %s with a warning when refresh fails",
    async (_operation, mutate) => {
      const refreshError = { message: "refresh failed" };
      mockFetchAllRecurring.mockRejectedValue(refreshError);

      await expect(mutate()).resolves.toEqual({
        refreshError: "refresh failed",
      });

      expect(useRecurringTableStore.getState().error).toBe("refresh failed");
      expect(useRecurringTableStore.getState().bulkError).toBeNull();
      expect(useRecurringTableStore.getState().bulkLoading).toBe(false);
    },
  );

  it("rejects a second recurring bulk update while the first is pending", async () => {
    const pendingUpdate = createDeferred();
    mockUpdateRecurringBulk.mockReturnValueOnce(pendingUpdate.promise);

    const firstCall = useRecurringTableStore
      .getState()
      .updateRecurringBulk(["r1"], {
        kind: "recurring",
        field: "payment_method",
        value: "cash",
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

    pendingUpdate.resolve(undefined);
    await firstCall;

    expect(mockFetchAllRecurring).toHaveBeenCalledTimes(1);
    expect(useRecurringTableStore.getState().bulkLoading).toBe(false);
  });
});
