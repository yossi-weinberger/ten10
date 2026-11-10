import { describe, expect, it } from "vitest";

function compactNumber(value: number): string {
  if (!Number.isFinite(value)) return "";
  
  const absValue = Math.abs(value);
  
  if (absValue >= 1000000) {
    return `${(value / 1000000).toFixed(absValue >= 10000000 ? 0 : 1)}M`;
  }
  if (absValue >= 1000) {
    return `${(value / 1000).toFixed(absValue >= 10000 ? 0 : 1)}K`;
  }
  return value.toFixed(0);
}

describe("compactNumber", () => {
  it("formats numbers under 1000 as-is", () => {
    expect(compactNumber(0)).toBe("0");
    expect(compactNumber(5)).toBe("5");
    expect(compactNumber(99)).toBe("99");
    expect(compactNumber(500)).toBe("500");
    expect(compactNumber(999)).toBe("999");
  });

  it("formats thousands with K suffix", () => {
    expect(compactNumber(1000)).toBe("1.0K");
    expect(compactNumber(1500)).toBe("1.5K");
    expect(compactNumber(5000)).toBe("5.0K");
    expect(compactNumber(9999)).toBe("10.0K");
    expect(compactNumber(10000)).toBe("10K");
    expect(compactNumber(12345)).toBe("12K");
    expect(compactNumber(99000)).toBe("99K");
  });

  it("formats millions with M suffix", () => {
    expect(compactNumber(1000000)).toBe("1.0M");
    expect(compactNumber(1500000)).toBe("1.5M");
    expect(compactNumber(5000000)).toBe("5.0M");
    expect(compactNumber(9999999)).toBe("10.0M");
    expect(compactNumber(10000000)).toBe("10M");
    expect(compactNumber(12345678)).toBe("12M");
    expect(compactNumber(99000000)).toBe("99M");
  });

  it("handles negative numbers", () => {
    expect(compactNumber(-500)).toBe("-500");
    expect(compactNumber(-1500)).toBe("-1.5K");
    expect(compactNumber(-12345)).toBe("-12K");
    expect(compactNumber(-1500000)).toBe("-1.5M");
  });

  it("handles edge cases", () => {
    expect(compactNumber(NaN)).toBe("");
    expect(compactNumber(Infinity)).toBe("");
    expect(compactNumber(-Infinity)).toBe("");
  });
});
