import { describe, expect, it } from "vitest";
import { bucketGrain, bucketKey } from "../../../supabase/functions/_shared/ai/admin-buckets";

describe("bucketGrain", () => {
  it("uses a day through 62 days, a week through 366, then a month", () => {
    expect(bucketGrain("2026-10-01", "2026-10-01")).toBe("day");
    expect(bucketGrain("2026-10-01", "2026-12-02")).toBe("day");
    expect(bucketGrain("2026-10-01", "2026-12-03")).toBe("week");
    expect(bucketGrain("2026-01-01", "2027-01-02")).toBe("week");
    expect(bucketGrain("2026-01-01", "2027-01-03")).toBe("month");
  });
});

describe("bucketKey", () => {
  it("starts a week on Monday UTC and a month on YYYY-MM", () => {
    expect(bucketKey("2026-10-23", "day")).toBe("2026-10-23");
    expect(bucketKey("2026-10-23", "week")).toBe("2026-10-19");
    expect(bucketKey("2026-10-19", "week")).toBe("2026-10-19");
    expect(bucketKey("2026-10-23", "month")).toBe("2026-10");
  });
});
