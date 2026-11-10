import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { computeLimitReset, formatDailyResetTime, formatMonthlyResetDate } from "./compute-limit-reset";

describe("computeLimitReset", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("daily_limit", () => {
    it("returns next 00:00 UTC when called during the day", () => {
      vi.setSystemTime(new Date("2026-11-10T14:30:00Z"));
      const reset = computeLimitReset("daily_limit");
      expect(reset).toEqual(new Date("2026-11-11T00:00:00Z"));
    });

    it("returns next 00:00 UTC when called just before midnight UTC", () => {
      vi.setSystemTime(new Date("2026-11-10T23:59:59Z"));
      const reset = computeLimitReset("daily_limit");
      expect(reset).toEqual(new Date("2026-11-11T00:00:00Z"));
    });

    it("returns next 00:00 UTC when called at 00:00 UTC", () => {
      vi.setSystemTime(new Date("2026-11-10T00:00:00Z"));
      const reset = computeLimitReset("daily_limit");
      expect(reset).toEqual(new Date("2026-11-11T00:00:00Z"));
    });

    it("handles month boundaries correctly", () => {
      vi.setSystemTime(new Date("2026-11-30T14:00:00Z"));
      const reset = computeLimitReset("daily_limit");
      expect(reset).toEqual(new Date("2026-12-01T00:00:00Z"));
    });

    it("handles year boundaries correctly", () => {
      vi.setSystemTime(new Date("2026-12-31T14:00:00Z"));
      const reset = computeLimitReset("daily_limit");
      expect(reset).toEqual(new Date("2027-01-01T00:00:00Z"));
    });
  });

  describe("quota_exhausted", () => {
    it("returns 1st of next month at 00:00 UTC", () => {
      vi.setSystemTime(new Date("2026-11-10T14:30:00Z"));
      const reset = computeLimitReset("quota_exhausted");
      expect(reset).toEqual(new Date("2026-12-01T00:00:00Z"));
    });

    it("returns 1st of next month when called on last day of month", () => {
      vi.setSystemTime(new Date("2026-11-30T23:59:59Z"));
      const reset = computeLimitReset("quota_exhausted");
      expect(reset).toEqual(new Date("2026-12-01T00:00:00Z"));
    });

    it("handles year boundaries correctly", () => {
      vi.setSystemTime(new Date("2026-12-15T14:00:00Z"));
      const reset = computeLimitReset("quota_exhausted");
      expect(reset).toEqual(new Date("2027-01-01T00:00:00Z"));
    });
  });

  describe("rate_limited", () => {
    it("returns null", () => {
      vi.setSystemTime(new Date("2026-11-10T14:30:00Z"));
      const reset = computeLimitReset("rate_limited");
      expect(reset).toBeNull();
    });
  });
});

describe("formatDailyResetTime in TZ=UTC", () => {
  it("formats time in Israel timezone for Hebrew locale", () => {
    const reset = new Date("2026-11-11T00:00:00Z");
    const formatted = formatDailyResetTime(reset, "he");
    expect(formatted).toMatch(/02:00/);
  });

  it("formats time in Israel timezone for English locale", () => {
    const reset = new Date("2026-11-11T00:00:00Z");
    const formatted = formatDailyResetTime(reset, "en");
    expect(formatted).toMatch(/02:00|2:00/);
  });

  it("handles edge case between 00:00 and 02:00 Israel time", () => {
    const reset = new Date("2026-11-10T00:00:00Z");
    const formatted = formatDailyResetTime(reset, "he");
    expect(formatted).toMatch(/02:00/);
  });
});

describe("formatMonthlyResetDate in TZ=UTC", () => {
  it("formats date for Hebrew locale", () => {
    const reset = new Date("2026-12-01T00:00:00Z");
    const formatted = formatMonthlyResetDate(reset, "he");
    expect(formatted).toContain("1");
    expect(formatted).toContain("12");
    expect(formatted).toContain("2026");
  });

  it("formats date for English locale", () => {
    const reset = new Date("2026-12-01T00:00:00Z");
    const formatted = formatMonthlyResetDate(reset, "en");
    expect(formatted).toContain("1");
    expect(formatted).toContain("12");
    expect(formatted).toContain("2026");
  });
});

describe("formatDailyResetTime in TZ=Asia/Jerusalem", () => {
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "Asia/Jerusalem";
  });

  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  it("formats time correctly in Israel timezone", () => {
    const reset = new Date("2026-11-11T00:00:00Z");
    const formatted = formatDailyResetTime(reset, "he");
    expect(formatted).toMatch(/02:00/);
  });

  it("handles edge case between 00:00 and 02:00 Israel time", () => {
    const reset = new Date("2026-11-10T00:00:00Z");
    const formatted = formatDailyResetTime(reset, "he");
    expect(formatted).toMatch(/02:00/);
  });
});

describe("formatMonthlyResetDate in TZ=Asia/Jerusalem", () => {
  const originalTZ = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "Asia/Jerusalem";
  });

  afterEach(() => {
    process.env.TZ = originalTZ;
  });

  it("formats date correctly in Israel timezone", () => {
    const reset = new Date("2026-12-01T00:00:00Z");
    const formatted = formatMonthlyResetDate(reset, "he");
    expect(formatted).toContain("1");
    expect(formatted).toContain("12");
    expect(formatted).toContain("2026");
  });
});
