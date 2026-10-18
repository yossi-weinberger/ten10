import { beforeAll, describe, expect, it } from "vitest";
import i18n from "@/lib/i18n";
import type { Currency } from "@/types/transaction";
import transactions_en from "../../../public/locales/en/transactions.json";
import transactions_he from "../../../public/locales/he/transactions.json";
import { normalizeRow } from "./normalize";
import { resolveTypeWithIssues } from "./type-resolver";
import { NORMALIZE_ROW_FIXTURE_GROUPS } from "./__fixtures__/normalize-row.fixtures";
import {
  RESOLVE_TYPE_ALIAS_FIXTURES,
  RESOLVE_TYPE_FALLBACK_FIXTURES,
  RESOLVE_TYPE_KEYWORD_FIXTURES,
} from "./__fixtures__/resolve-type.fixtures";

// The i18next type workaround in src/declarations.d.ts hides addResourceBundle.
type ResourceBundleLoader = {
  addResourceBundle(lng: string, ns: string, resources: object, deep: boolean, overwrite: boolean): void;
};

// normalizeCategoryValue caches its label map on first use, so the lazily
// loaded "transactions" namespace must be present before any row is normalized.
beforeAll(() => {
  const loader = i18n as unknown as ResourceBundleLoader;
  loader.addResourceBundle("en", "transactions", transactions_en, true, true);
  loader.addResourceBundle("he", "transactions", transactions_he, true, true);
});

describe("normalizeRow characterization", () => {
  for (const [group, fixtures] of Object.entries(NORMALIZE_ROW_FIXTURE_GROUPS)) {
    describe(group, () => {
      it.each(fixtures.map((f) => [f.name, f] as const))("%s", (_name, fixture) => {
        expect(
          normalizeRow(fixture.input, fixture.defaultCurrency as Currency),
        ).toEqual(fixture.expected);
      });
    });
  }
});

describe("resolveTypeWithIssues characterization", () => {
  const groups = {
    "locale aliases": RESOLVE_TYPE_ALIAS_FIXTURES,
    "sign fallback": RESOLVE_TYPE_FALLBACK_FIXTURES,
    "income keywords": RESOLVE_TYPE_KEYWORD_FIXTURES,
  };

  for (const [group, fixtures] of Object.entries(groups)) {
    describe(group, () => {
      it.each(fixtures.map((f) => [f.name, f] as const))("%s", (_name, fixture) => {
        expect(resolveTypeWithIssues(fixture.params)).toEqual(fixture.expected);
      });
    });
  }
});
