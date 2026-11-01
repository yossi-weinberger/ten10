import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  fieldBacktick,
  inspirationItemsFromSources,
  masterBlocks,
  readInspirationSources,
  type InspirationItem,
} from "../content/library/inspiration-records.mjs";

const sources = readInspirationSources(process.cwd());
const written = JSON.parse(readFileSync("src/lib/ai/inspiration-library.json", "utf8")) as InspirationItem[];

describe("inspiration library export", () => {
  const items = inspirationItemsFromSources(sources);
  const blocks = masterBlocks(sources.masterText).filter((block) => fieldBacktick(block, "id"));
  const halakha = blocks.filter((block) => fieldBacktick(block, "type") === "halakha");
  const orphans = sources.emailHe.monthlyEncouragements.filter((row) => !row.contentId);

  it("keeps every non-halakha record and email rows that have no content id", () => {
    expect(blocks).toHaveLength(83);
    expect(halakha).toHaveLength(8);
    expect(orphans).toHaveLength(0);
    expect(items).toHaveLength(75);
    expect(written).toEqual(items);
  });

  it("gives every item an id, a title, and a body, and never a halakha type", () => {
    expect(items.some((item) => item.type === "halakha")).toBe(false);
    for (const item of items) {
      expect(item.id.length).toBeGreaterThan(0);
      expect(item.title.length).toBeGreaterThan(0);
      expect(item.body.length).toBeGreaterThan(0);
    }
    const ids = items.map((item) => item.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("attaches the English email text to the twelve linked items", () => {
    const linked = sources.emailEn.monthlyEncouragements.filter((row) => row.contentId);
    expect(linked).toHaveLength(12);
    for (const row of linked) {
      const item = items.find((candidate) => candidate.id === row.contentId);
      expect(item?.body_en).toBe(row.body);
      expect(item?.source_en).toBe(row.source);
    }
  });
});
