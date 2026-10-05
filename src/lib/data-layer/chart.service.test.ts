import { beforeEach, describe, expect, it, vi } from "vitest";

const mockRpc = vi.fn();
const mockInvoke = vi.fn();
let platform: "web" | "desktop" = "web";

vi.mock("@/lib/supabaseClient", () => ({
  supabase: { rpc: (...args: unknown[]) => mockRpc(...args) },
}));
vi.mock("../platformManager", () => ({
  getPlatform: () => platform,
}));
vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => mockInvoke(...args),
}));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), log: vi.fn(), warn: vi.fn() },
}));

import { fetchServerMonthlyChartData } from "./chart.service";

beforeEach(() => {
  vi.clearAllMocks();
  platform = "web";
  mockRpc.mockResolvedValue({
    data: [
      {
        period_index: 1,
        period_start: "2026-09-12",
        period_end: "2026-10-12",
        income: 100,
        donations: 10,
        expenses: 20,
      },
      {
        period_index: 2,
        period_start: "2026-10-12",
        period_end: "2026-11-11",
        income: 0,
        donations: 0,
        expenses: 0,
      },
    ],
    error: null,
  });
  mockInvoke.mockResolvedValue([]);
});

describe("fetchServerMonthlyChartData", () => {
  const boundaries = [
    "2026-09-12",
    "2026-10-12",
    "2026-11-11",
  ];

  it("calls the period RPC with explicit Gregorian boundaries", async () => {
    const result = await fetchServerMonthlyChartData(
      "user-1",
      boundaries,
      "hebrew",
    );

    expect(mockRpc).toHaveBeenCalledWith(
      "get_period_financial_summary",
      {
        p_user_id: "user-1",
        p_boundaries: boundaries,
      },
    );
    expect(result).toEqual([
      {
        period_index: 1,
        period_start: "2026-09-12",
        period_end: "2026-10-12",
        period_key: "5787-01",
        cache_key: "hebrew:5787-01",
        income: 100,
        donations: 10,
        expenses: 20,
      },
      {
        period_index: 2,
        period_start: "2026-10-12",
        period_end: "2026-11-11",
        period_key: "5787-02",
        cache_key: "hebrew:5787-02",
        income: 0,
        donations: 0,
        expenses: 0,
      },
    ]);
  });

  it("invokes the desktop period command with the same boundaries", async () => {
    platform = "desktop";

    await fetchServerMonthlyChartData(
      null,
      boundaries,
      "hebrew",
    );

    expect(mockInvoke).toHaveBeenCalledWith(
      "get_desktop_period_financial_summary",
      { boundaries },
    );
  });
});
