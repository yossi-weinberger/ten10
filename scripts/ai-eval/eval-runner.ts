import type { DecisionAdapter, DecisionFields } from "./decision.ts";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const EVAL_NOTES = [
  "standard",
  "foreign-currency",
  "ambiguous-tithe",
  "prompt-injection",
] as const;

export type EvalNote = (typeof EVAL_NOTES)[number];

export interface EvalExpected {
  readonly date: string;
  readonly amount: number;
  readonly currency: string;
  readonly type: string;
}

export interface EvalFixture {
  readonly id: string;
  readonly language: "he" | "en";
  readonly note: EvalNote;
  readonly fields: DecisionFields;
  readonly expected: EvalExpected;
}

export interface EvalCaseScore {
  readonly id: string;
  readonly choice: string;
  readonly date: boolean;
  readonly amount: boolean;
  readonly currency: boolean;
  readonly type: boolean;
}

export interface EvalReport {
  readonly total: number;
  readonly exactDate: number;
  readonly exactAmount: number;
  readonly exactCurrency: number;
  readonly exactType: number;
  readonly cases: readonly EvalCaseScore[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireString(
  record: Record<string, unknown>,
  key: string,
  id: string,
): string {
  const value = record[key];
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`eval fixture ${id} is missing ${key}`);
  }
  return value;
}

function requireDate(
  record: Record<string, unknown>,
  key: string,
  id: string,
): string {
  const value = requireString(record, key, id);
  if (!DATE_RE.test(value)) {
    throw new Error(`eval fixture ${id} has a non-ISO ${key}`);
  }
  return value;
}

function requireAmount(
  record: Record<string, unknown>,
  key: string,
  id: string,
): number {
  const value = record[key];
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`eval fixture ${id} is missing ${key}`);
  }
  return value;
}

function requireNote(value: unknown, id: string): EvalNote {
  if (
    typeof value === "string" &&
    (EVAL_NOTES as readonly string[]).includes(value)
  ) {
    return value as EvalNote;
  }
  throw new Error(`eval fixture ${id} has an unknown note`);
}

function readFields(value: unknown, id: string): DecisionFields {
  if (!isRecord(value)) {
    throw new Error(`eval fixture ${id} is missing fields`);
  }
  return {
    date: requireDate(value, "date", id),
    amount: requireAmount(value, "amount", id),
    currency: requireString(value, "currency", id),
    type: requireString(value, "type", id),
    text: requireString(value, "text", id),
  };
}

function readExpected(value: unknown, id: string): EvalExpected {
  if (!isRecord(value)) {
    throw new Error(`eval fixture ${id} is missing expected`);
  }
  return {
    date: requireDate(value, "date", id),
    amount: requireAmount(value, "amount", id),
    currency: requireString(value, "currency", id),
    type: requireString(value, "type", id),
  };
}

export function parseEvalFixtures(raw: string): readonly EvalFixture[] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("eval fixtures are not valid JSON");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("eval fixtures must be a non-empty array");
  }

  return parsed.map((entry, index) => {
    if (!isRecord(entry)) {
      throw new Error(`eval fixture at index ${index} is not an object`);
    }
    const id = requireString(entry, "id", String(index));
    const language = requireString(entry, "language", id);
    if (language !== "he" && language !== "en") {
      throw new Error(`eval fixture ${id} has an unknown language`);
    }
    return {
      id,
      language,
      note: requireNote(entry.note, id),
      fields: readFields(entry.fields, id),
      expected: readExpected(entry.expected, id),
    };
  });
}

export async function scoreEvalFixtures(
  fixtures: readonly EvalFixture[],
  adapter: DecisionAdapter,
  choices: readonly string[],
): Promise<EvalReport> {
  if (choices.length === 0) {
    throw new Error("eval requires a closed choice list");
  }

  const cases: EvalCaseScore[] = [];
  for (const fixture of fixtures) {
    const decision = await adapter.decide({
      choices,
      fields: fixture.fields,
    });
    if (!choices.includes(decision.choice)) {
      throw new Error(
        `eval fixture ${fixture.id} returned a choice outside the allowed set`,
      );
    }
    cases.push({
      id: fixture.id,
      choice: decision.choice,
      date: fixture.fields.date === fixture.expected.date,
      amount: fixture.fields.amount === fixture.expected.amount,
      currency: fixture.fields.currency === fixture.expected.currency,
      type: decision.choice === fixture.expected.type,
    });
  }

  return {
    total: cases.length,
    exactDate: cases.filter((entry) => entry.date).length,
    exactAmount: cases.filter((entry) => entry.amount).length,
    exactCurrency: cases.filter((entry) => entry.currency).length,
    exactType: cases.filter((entry) => entry.type).length,
    cases,
  };
}

export async function runOfflineEval(
  source: string | URL,
  readText: (path: string | URL) => Promise<string>,
  adapter: DecisionAdapter,
  choices: readonly string[],
): Promise<EvalReport> {
  const raw = await readText(source);
  return scoreEvalFixtures(parseEvalFixtures(raw), adapter, choices);
}
