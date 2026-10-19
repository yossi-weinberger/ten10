import { describe, expect, it } from "vitest";
import {
  ARRIVAL_CODE_MAX_LENGTH,
  normalizeArrivalCode,
  sanitizeArrivalCodeInput,
} from "./arrival-code";

describe("normalizeArrivalCode", () => {
  it("trims and uppercases a valid code", () => {
    expect(normalizeArrivalCode("  machon  ")).toBe("MACHON");
    expect(normalizeArrivalCode("A1_-Z")).toBe("A1_-Z");
  });

  it("rejects empty, oversized, or illegal values", () => {
    expect(normalizeArrivalCode("")).toBeNull();
    expect(normalizeArrivalCode("   ")).toBeNull();
    expect(normalizeArrivalCode(null)).toBeNull();
    expect(normalizeArrivalCode("bad code")).toBeNull();
    expect(normalizeArrivalCode("MACHON!")).toBeNull();
    expect(normalizeArrivalCode("A".repeat(ARRIVAL_CODE_MAX_LENGTH + 1))).toBeNull();
  });
});

describe("sanitizeArrivalCodeInput", () => {
  it("strips illegal characters and caps length while typing", () => {
    expect(sanitizeArrivalCodeInput("machon!!")).toBe("MACHON");
    expect(sanitizeArrivalCodeInput("a".repeat(40))).toHaveLength(
      ARRIVAL_CODE_MAX_LENGTH
    );
  });
});
