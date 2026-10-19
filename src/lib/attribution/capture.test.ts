import { describe, expect, it } from "vitest";
import {
  FIRST_TOUCH_STORAGE_KEY,
  attributionProperties,
  captureAttributionFromLocation,
  getLocationSearchParams,
  parseAttributionSearch,
  persistFirstTouchIfEmpty,
  readFirstTouch,
} from "./capture";

function memoryStorage(initial?: Record<string, string>) {
  const data = new Map<string, string>(Object.entries(initial ?? {}));
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => {
      data.set(key, value);
    },
  };
}

describe("parseAttributionSearch", () => {
  it("reads ref and UTM params from a landing redirect", () => {
    const touch = parseAttributionSearch(
      "ref=MACHON&utm_source=institute&utm_medium=email&utm_campaign=update_2026"
    );
    expect(touch).toMatchObject({
      code: "MACHON",
      utm: {
        utm_source: "institute",
        utm_medium: "email",
        utm_campaign: "update_2026",
      },
    });
    expect(touch?.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("fills UTM from the registry when only ref is present", () => {
    expect(parseAttributionSearch("ref=machon")).toMatchObject({
      code: "MACHON",
      utm: {
        utm_source: "institute",
        utm_medium: "email",
        utm_campaign: "update_2026",
      },
    });
  });

  it("accepts arrival_code as an alias for ref", () => {
    expect(parseAttributionSearch("arrival_code=FORUMS")).toMatchObject({
      code: "FORUMS",
    });
  });

  it("returns null when there is nothing to persist", () => {
    expect(parseAttributionSearch("")).toBeNull();
    expect(parseAttributionSearch("foo=bar")).toBeNull();
  });
});

describe("first-touch persistence", () => {
  it("stores the first campaign and ignores a later one", () => {
    const storage = memoryStorage();
    const first = parseAttributionSearch("ref=MACHON")!;
    const second = parseAttributionSearch(
      "ref=FORUMS&utm_source=community&utm_medium=post&utm_campaign=later"
    )!;

    expect(persistFirstTouchIfEmpty(first, storage)).toBe(true);
    expect(persistFirstTouchIfEmpty(second, storage)).toBe(false);
    expect(readFirstTouch(storage)?.code).toBe("MACHON");
    expect(storage.getItem(FIRST_TOUCH_STORAGE_KEY)).toContain("MACHON");
  });

  it("captures query params from the hash on desktop-style URLs", () => {
    const storage = memoryStorage();
    const location = {
      search: "",
      hash: "#/landing?ref=MACHON&utm_source=institute&utm_medium=email&utm_campaign=update_2026",
    };
    expect(getLocationSearchParams(location).get("ref")).toBe("MACHON");
    expect(captureAttributionFromLocation(location, storage)?.code).toBe(
      "MACHON"
    );
  });
});

describe("first-touch survival", () => {
  it("survives navigation by reading the stored first-touch record", () => {
    const storage = memoryStorage();
    persistFirstTouchIfEmpty(parseAttributionSearch("ref=MACHON")!, storage);
    expect(
      captureAttributionFromLocation({ search: "", hash: "" }, storage)?.code
    ).toBe("MACHON");
  });

  it("exposes PostHog person/super properties from the stored touch", () => {
    expect(
      attributionProperties({
        code: "MACHON",
        utm: {
          utm_source: "institute",
          utm_medium: "email",
          utm_campaign: "update_2026",
        },
        capturedAt: "2026-10-19T08:00:00.000Z",
      })
    ).toEqual({
      arrival_code: "MACHON",
      utm_source: "institute",
      utm_medium: "email",
      utm_campaign: "update_2026",
    });
    expect(attributionProperties(null)).toEqual({});
  });
});
