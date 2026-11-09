import { NORMALIZE_ROW_FIXTURE_GROUPS } from "../../../../src/lib/import/__fixtures__/normalize-row.fixtures.ts";
import {
  RESOLVE_TYPE_ALIAS_FIXTURES,
  RESOLVE_TYPE_FALLBACK_FIXTURES,
  RESOLVE_TYPE_KEYWORD_FIXTURES,
} from "../../../../src/lib/import/__fixtures__/resolve-type.fixtures.ts";
import { normalizeRow } from "./normalize-core.ts";
import {
  AI_DRAFT,
  FILE_IMPORT,
  resolveTypeWithIssues,
} from "./transaction-types.ts";

function stable(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stable);
  if (value !== null && typeof value === "object") {
    const sorted: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      sorted[key] = stable((value as Record<string, unknown>)[key]);
    }
    return sorted;
  }
  return value;
}

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(stable(actual));
  const expectedJson = JSON.stringify(stable(expected));
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

Deno.test("FILE_IMPORT normalize fixtures match characterization", () => {
  for (const fixtures of Object.values(NORMALIZE_ROW_FIXTURE_GROUPS)) {
    for (const fixture of fixtures) {
      assertEquals(
        normalizeRow(fixture.input, fixture.defaultCurrency),
        fixture.expected,
      );
    }
  }
});

Deno.test("resolveTypeWithIssues fixtures match characterization", () => {
  const fixtures = [
    ...RESOLVE_TYPE_ALIAS_FIXTURES,
    ...RESOLVE_TYPE_FALLBACK_FIXTURES,
    ...RESOLVE_TYPE_KEYWORD_FIXTURES,
  ];
  for (const fixture of fixtures) {
    assertEquals(resolveTypeWithIssues(fixture.params), fixture.expected);
  }
});

Deno.test("AI_DRAFT keeps a supported foreign currency for later conversion", () => {
  const result = normalizeRow(
    { date: "2024-03-15", amount: "10", currency: "USD" },
    "ILS",
    AI_DRAFT,
  );
  assertEquals(result.issues, []);
  assertEquals(
    result.normalized && {
      amount: result.normalized.amount,
      currency: result.normalized.currency,
      original_amount: result.normalized.original_amount,
      original_currency: result.normalized.original_currency,
      conversion_rate: result.normalized.conversion_rate,
      conversion_date: result.normalized.conversion_date,
      rate_source: result.normalized.rate_source,
      type: result.normalized.type,
    },
    {
      amount: 10,
      currency: "USD",
      original_amount: 10,
      original_currency: "USD",
      conversion_rate: null,
      conversion_date: null,
      rate_source: null,
      type: "income",
    },
  );
});

Deno.test("AI_DRAFT still rejects an unsupported currency", () => {
  const result = normalizeRow(
    { date: "2024-03-15", amount: "10", currency: "jpy" },
    "ILS",
    AI_DRAFT,
  );
  assertEquals(result.normalized, null);
  assertEquals(result.issues, [
    { code: "unsupported_currency", field: "currency", detail: "jpy" },
  ]);
});

Deno.test("AI_DRAFT accepts explicit canonical types except initial_balance", () => {
  assertEquals(
    resolveTypeWithIssues({ amount: -5, rawType: "exempt-income" }, AI_DRAFT),
    { type: "exempt-income", issues: [] },
  );
  assertEquals(
    resolveTypeWithIssues({ amount: 5, rawType: "non_tithe_donation" }, AI_DRAFT),
    { type: "non_tithe_donation", issues: [] },
  );
  assertEquals(
    resolveTypeWithIssues({ amount: -5, rawType: "recognized-expense" }, AI_DRAFT),
    { type: "recognized-expense", issues: [] },
  );
  assertEquals(
    resolveTypeWithIssues({ amount: 5, rawType: "initial_balance" }, AI_DRAFT),
    { type: "income", issues: [] },
  );
});

Deno.test("FILE_IMPORT still rejects foreign currency and the recognized-expense key", () => {
  const result = normalizeRow(
    { date: "2024-03-15", amount: "10", currency: "USD" },
    "ILS",
    FILE_IMPORT,
  );
  assertEquals(result.normalized, null);
  assertEquals(result.issues, [
    { code: "foreign_currency_not_supported", field: "currency", detail: "USD" },
  ]);
  assertEquals(
    resolveTypeWithIssues({ amount: -5, rawType: "recognized-expense" }, FILE_IMPORT),
    { type: "expense", issues: [] },
  );
});
