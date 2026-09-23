import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRpc = vi.fn();

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
vi.mock("../platformManager", () => ({
  getPlatform: () => "web",
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), log: vi.fn(), warn: vi.fn() },
}));

import { fetchServerMonthlyChartData } from "./chart.service";

beforeEach(() => {
  vi.clearAllMocks();
  mockRpc.mockResolvedValue({ data: [], error: null });
});

describe("fetchServerMonthlyChartData", () => {
  it("serializes a local chart end date shortly after midnight", async () => {
    await fetchServerMonthlyChartData(
      "user-1",
      new Date(2026, 8, 23, 0, 30),
      6,
    );

    expect(mockRpc).toHaveBeenCalledWith(
      "get_monthly_financial_summary",
      expect.objectContaining({ p_end_date: "2026-09-23" }),
    );
  });

  it("serializes a local chart end date shortly before midnight", async () => {
    await fetchServerMonthlyChartData(
      "user-1",
      new Date(2026, 8, 23, 23, 30),
      6,
    );

    expect(mockRpc).toHaveBeenCalledWith(
      "get_monthly_financial_summary",
      expect.objectContaining({ p_end_date: "2026-09-23" }),
    );
  });
});
