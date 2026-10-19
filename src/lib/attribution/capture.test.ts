import { describe, expect, it } from "vitest";
import {
  FIRST_TOUCH_STORAGE_KEY,
  attributionEventProperties,
  attributionPersonSetOnceProperties,
  captureAttributionFromLocation,
  getLocationSearchParams,
  normalizeCampaignRef,
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

const machonTouch = {
  code: "MACHON",
  utm: {
    utm_source: "institute",
    utm_medium: "email",
    utm_campaign: "update_2026",
  },
  capturedAt: "2026-10-19T08:00:00.000Z",
};

describe("normalizeCampaignRef", () => {
  it("trims and uppercases a valid short-link code", () => {
    expect(normalizeCampaignRef("  machon  ")).toBe("MACHON");
    expect(normalizeCampaignRef("A1_-Z")).toBe("A1_-Z");
  });

  it("rejects empty or illegal codes", () => {
    expect(normalizeCampaignRef("")).toBeNull();
    expect(normalizeCampaignRef("bad code")).toBeNull();
    expect(normalizeCampaignRef("MACHON!")).toBeNull();
    expect(normalizeCampaignRef("A".repeat(33))).toBeNull();
  });
});

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

  it("ignores the old arrival_code query alias", () => {
    expect(parseAttributionSearch("arrival_code=FORUMS")).toBeNull();
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

  it("exposes PostHog event/super and $set_once properties", () => {
    expect(attributionEventProperties(machonTouch)).toEqual({
      ref: "MACHON",
      utm_source: "institute",
      utm_medium: "email",
      utm_campaign: "update_2026",
    });
    expect(attributionPersonSetOnceProperties(machonTouch)).toEqual({
      initial_ref: "MACHON",
      first_touch_utm_source: "institute",
      first_touch_utm_medium: "email",
      first_touch_utm_campaign: "update_2026",
    });
    expect(attributionEventProperties(null)).toEqual({});
    expect(attributionPersonSetOnceProperties(null)).toEqual({});
  });
});
