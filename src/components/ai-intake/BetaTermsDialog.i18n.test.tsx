// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import he_navigation from "../../../public/locales/he/navigation.json";
import en_navigation from "../../../public/locales/en/navigation.json";
import he_betaTerms from "../../../public/locales/he/betaTerms.json";
import en_betaTerms from "../../../public/locales/en/betaTerms.json";

describe("BetaTermsDialog i18n keys", () => {
  const dialogKeys = [
    "aiIntake.betaTerms.title",
    "aiIntake.betaTerms.description",
    "aiIntake.betaTerms.shortDescription",
    "aiIntake.betaTerms.readFullTerms",
    "aiIntake.betaTerms.acceptButton",
    "aiIntake.betaTerms.declineButton",
    "aiIntake.betaTerms.accepting",
    "aiIntake.betaTerms.acceptSuccess",
    "aiIntake.betaTerms.acceptError",
    "aiIntake.betaTerms.checkingTitle",
    "aiIntake.betaTerms.checkingDescription",
    "aiIntake.betaTerms.cancelCheck",
    "aiIntake.betaTerms.checkTimeout",
  ];

  it("all BetaTermsDialog keys exist in Hebrew navigation.json", () => {
    dialogKeys.forEach((key) => {
      const parts = key.split(".");
      let obj: unknown = he_navigation;
      for (const part of parts) {
        expect(obj).toBeDefined();
        expect(obj).toBeTypeOf("object");
        obj = (obj as Record<string, unknown>)[part];
      }
      expect(obj).toBeDefined();
      expect(typeof obj).toBe("string");
    });
  });

  it("all BetaTermsDialog keys exist in English navigation.json", () => {
    dialogKeys.forEach((key) => {
      const parts = key.split(".");
      let obj: unknown = en_navigation;
      for (const part of parts) {
        expect(obj).toBeDefined();
        expect(obj).toBeTypeOf("object");
        obj = (obj as Record<string, unknown>)[part];
      }
      expect(obj).toBeDefined();
      expect(typeof obj).toBe("string");
    });
  });
});

describe("BetaTermsPage i18n keys", () => {
  const pageKeys = [
    "title",
    "lastUpdated",
    "acceptance.title",
    "acceptance.description",
    "service.title",
    "service.description",
    "service.item1",
    "service.item2",
    "service.item3",
    "dataCollection.title",
    "dataCollection.description",
    "dataCollection.item1",
    "dataCollection.item2",
    "dataCollection.item3",
    "dataCollection.item4",
    "retention.title",
    "retention.description",
    "processors.title",
    "processors.description",
    "processors.item1",
    "processors.item2",
    "processors.item3",
    "yourRights.title",
    "yourRights.description",
    "security.title",
    "security.description",
    "disclaimer.title",
    "disclaimer.description",
    "disclaimer.note",
    "generalTerms.title",
    "generalTerms.description",
    "generalTerms.linkPrefix",
    "generalTerms.linkText",
    "generalTerms.linkSuffix",
  ];

  it("all BetaTermsPage keys exist in Hebrew betaTerms.json", () => {
    pageKeys.forEach((key) => {
      const parts = key.split(".");
      let obj: unknown = he_betaTerms;
      for (const part of parts) {
        expect(obj, `Missing key path: ${key} at part: ${part}`).toBeDefined();
        expect(obj, `Non-object at key path: ${key} at part: ${part}`).toBeTypeOf("object");
        obj = (obj as Record<string, unknown>)[part];
      }
      expect(obj, `Missing final value for key: ${key}`).toBeDefined();
      expect(typeof obj, `Non-string value for key: ${key}`).toBe("string");
    });
  });

  it("all BetaTermsPage keys exist in English betaTerms.json", () => {
    pageKeys.forEach((key) => {
      const parts = key.split(".");
      let obj: unknown = en_betaTerms;
      for (const part of parts) {
        expect(obj, `Missing key path: ${key} at part: ${part}`).toBeDefined();
        expect(obj, `Non-object at key path: ${key} at part: ${part}`).toBeTypeOf("object");
        obj = (obj as Record<string, unknown>)[part];
      }
      expect(obj, `Missing final value for key: ${key}`).toBeDefined();
      expect(typeof obj, `Non-string value for key: ${key}`).toBe("string");
    });
  });
});
