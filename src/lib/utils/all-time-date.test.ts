import { describe, expect, it } from "vitest";
import {
  ALL_TIME_START_DATE,
  isAllTimeStartDate,
  toRpcDateRangeArgs,
} from "./all-time-date";

describe("all-time sentinel", () => {
  it("uses year 0001 so BETWEEN on current prod RPCs includes pre-1970 rows", () => {
    expect(ALL_TIME_START_DATE).toBe("0001-01-01");
    expect("1926-01-01" >= ALL_TIME_START_DATE).toBe(true);
    expect("1969-12-31" >= ALL_TIME_START_DATE).toBe(true);
  });

  it("builds old-RPC-compatible BETWEEN args without a null start", () => {
    const args = toRpcDateRangeArgs(ALL_TIME_START_DATE, "2026-10-08");
    expect(args).toEqual({
      p_start_date: "0001-01-01",
      p_end_date: "2026-10-08",
    });
    expect(args.p_start_date).not.toBeNull();
    expect(typeof args.p_start_date).toBe("string");
    expect(isAllTimeStartDate(args.p_start_date)).toBe(true);
  });
});
