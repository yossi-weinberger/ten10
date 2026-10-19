import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  buildVercelRedirects,
  listShortLinks,
} from "../src/lib/attribution/short-links";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

describe("short-link vercel sync", () => {
  it("keeps vercel.json redirects in sync with every registry entry", () => {
    const vercel = JSON.parse(
      readFileSync(join(repoRoot, "vercel.json"), "utf8")
    ) as {
      redirects?: Array<{
        source: string;
        destination: string;
        permanent?: boolean;
      }>;
    };

    const redirects = vercel.redirects ?? [];
    const expected = buildVercelRedirects();

    expect(listShortLinks().length).toBeGreaterThan(0);
    expect(expected.length).toBeGreaterThan(0);

    for (const entry of expected) {
      expect(redirects).toContainEqual(entry);
    }
  });
});
