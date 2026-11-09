import { describe, expect, it } from "vitest";
import { INSPIRATION_LIBRARY } from "./inspiration-library";
import {
  itemsForLanguage,
  pickInspiration,
  readRecentIds,
  rememberInspiration,
  type IdStorage,
  type InspirationView,
  visibleSource,
} from "./inspiration-pick";

function memoryStorage(): IdStorage & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: (key) => (key in data ? data[key] : null),
    setItem: (key, value) => {
      data[key] = value;
    },
  };
}

const items: InspirationView[] = [
  { id: "a", title: "A", body: "one", source: "s" },
  { id: "b", title: "B", body: "two", source: "" },
  { id: "c", title: "C", body: "three", source: "t" },
];

describe("inspiration pick", () => {
  it("skips the ten most recent ids", () => {
    const recent = ["a", "b"];
    const picked = pickInspiration(items, recent, () => 0);
    expect(picked?.id).toBe("c");
  });

  it("uses the whole pool when every item is recent", () => {
    const picked = pickInspiration(items, ["a", "b", "c"], () => 0.9);
    expect(picked?.id).toBe("c");
  });

  it("remembers an id and ignores a broken store", () => {
    const storage = memoryStorage();
    rememberInspiration(storage, "a");
    rememberInspiration(storage, "b");
    expect(readRecentIds(storage)).toEqual(["a", "b"]);
    const broken: IdStorage = {
      getItem: () => {
        throw new Error("denied");
      },
      setItem: () => {
        throw new Error("denied");
      },
    };
    expect(readRecentIds(broken)).toEqual([]);
    expect(() => rememberInspiration(broken, "a")).not.toThrow();
  });

  it("shows Hebrew from the master and English from the library fields", () => {
    expect(itemsForLanguage(INSPIRATION_LIBRARY, "he")).toHaveLength(75);
    const english = itemsForLanguage(INSPIRATION_LIBRARY, "en");
    expect(english).toHaveLength(75);
    expect(english.every((item) => item.body.length > 0 && item.title.length > 0)).toBe(true);
    expect(english.find((item) => item.id === "TN10-0002")?.title).toBe("Test Me now in this");
  });
  it("hides the library's missing-source placeholder", () => {
    expect(visibleSource("לא צוין במקור המיובא")).toBe("");
    expect(visibleSource("סיפור שפורסם בעלון; שם העלון לא צוין במקור המיובא")).toBe("סיפור שפורסם בעלון");
    expect(visibleSource("Draft for review. Not a published translation. Not named in the imported source."))
      .toBe("Draft for review. Not a published translation.");
    expect(visibleSource("Malachi 3:10")).toBe("Malachi 3:10");
  });

  it("shows no placeholder source from the library", () => {
    expect(itemsForLanguage(INSPIRATION_LIBRARY, "he").some((item) => item.source.includes("במקור המיובא"))).toBe(false);
  });
});
