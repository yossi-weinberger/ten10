import { describe, expect, it } from "vitest";
import {
  SHORT_LINK_REGISTRY,
  buildRedirectHref,
  findShortLinkByCode,
  findShortLinkByPath,
  normalizeShortLinkPath,
} from "./short-links";

describe("short-link registry", () => {
  it("maps machon to the institute email campaign", () => {
    expect(SHORT_LINK_REGISTRY.machon).toEqual({
      code: "MACHON",
      utm_source: "institute",
      utm_medium: "email",
      utm_campaign: "update_2026",
      target: "/landing",
    });
  });

  it("resolves paths case-insensitively and ignores a trailing slash", () => {
    for (const path of ["/machon", "/MACHON", "/machon/", "/Machon/"]) {
      expect(findShortLinkByPath(path)?.code).toBe("MACHON");
    }
    expect(normalizeShortLinkPath("/MACHON/")).toBe("machon");
    expect(findShortLinkByPath("/not-a-campaign")).toBeNull();
  });

  it("looks up a campaign by arrival code", () => {
    expect(findShortLinkByCode("machon")?.path).toBe("machon");
    expect(findShortLinkByCode("unknown")).toBeNull();
  });

  it("builds the landing href with ref and UTM params", () => {
    expect(buildRedirectHref(SHORT_LINK_REGISTRY.machon)).toBe(
      "/landing?ref=MACHON&utm_source=institute&utm_medium=email&utm_campaign=update_2026"
    );
  });
});

