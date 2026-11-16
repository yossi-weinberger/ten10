import { beforeEach, describe, expect, it, vi } from "vitest";

const setLastDbFetchTimestamp = vi.fn();
const fetchTransactions = vi.fn();
const pagination = { currentPage: 1 };

vi.mock("@/lib/store", () => ({
  useDonationStore: {
    getState: () => ({ setLastDbFetchTimestamp }),
  },
}));

vi.mock("@/lib/tableTransactions/tableTransactions.store", () => ({
  useTableTransactionsStore: {
    getState: () => ({ fetchTransactions, pagination }),
  },
}));

import { refreshAfterIntakeSave, refreshOnVisible } from "./refresh-after-intake";

describe("refreshAfterIntakeSave", () => {
  beforeEach(() => {
    setLastDbFetchTimestamp.mockReset();
    fetchTransactions.mockReset();
    pagination.currentPage = 1;
  });

  it("bumps the shared fetch timestamp and reloads the web table", () => {
    refreshAfterIntakeSave();

    expect(setLastDbFetchTimestamp).toHaveBeenCalledOnce();
    expect(setLastDbFetchTimestamp.mock.calls[0]?.[0]).toEqual(expect.any(Number));
    expect(fetchTransactions).toHaveBeenCalledWith(true, "web");
  });

  it("refreshes when the document becomes visible again", () => {
    refreshOnVisible("hidden");
    expect(fetchTransactions).not.toHaveBeenCalled();

    refreshOnVisible("visible");
    expect(fetchTransactions).toHaveBeenCalledWith(true, "web");
  });

  it("leaves a table the user paged into where it is", () => {
    pagination.currentPage = 3;
    refreshOnVisible("visible");
    expect(setLastDbFetchTimestamp).toHaveBeenCalledOnce();
    expect(fetchTransactions).not.toHaveBeenCalled();
  });
});
