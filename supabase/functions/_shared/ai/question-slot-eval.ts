import { INTENT_CONFIDENCE_MIN } from "./jev-intent.ts";

export const SLOT_EVAL_FIELDS = ["family", "measure", "recipient", "category", "payment_method"] as const;
export type SlotEvalField = (typeof SLOT_EVAL_FIELDS)[number];

export type SlotEvalExpected = Record<SlotEvalField, string | null>;

export type SlotEvalCase = {
  id: string;
  text: string;
  expected: SlotEvalExpected;
};

export type SlotEvalFixture = {
  lists: { recipients: string[]; categories: string[] };
  cases: SlotEvalCase[];
};

export type SlotFieldScore = {
  correct: number;
  missed: number;
  confidentWrong: number;
};

export type SlotEvalScore = {
  total: number;
  correct: number;
  missed: number;
  confidentWrong: number;
  byField: Record<SlotEvalField, SlotFieldScore>;
};

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string")) return null;
  return value;
}

function expectedFields(value: unknown): SlotEvalExpected | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const expected = {} as SlotEvalExpected;
  for (const field of SLOT_EVAL_FIELDS) {
    const item = record[field];
    if (item !== null && typeof item !== "string") return null;
    expected[field] = item;
  }
  return expected;
}

/** Lists come from the fixture. A bare array of cases is the old shape and is rejected. */
export function readSlotEvalFixture(value: unknown): SlotEvalFixture | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { lists?: unknown; cases?: unknown };
  if (!record.lists || typeof record.lists !== "object" || Array.isArray(record.lists)) return null;
  const lists = record.lists as { recipients?: unknown; categories?: unknown };
  const recipients = stringList(lists.recipients);
  const categories = stringList(lists.categories);
  if (!recipients || !categories || !Array.isArray(record.cases)) return null;
  const cases: SlotEvalCase[] = [];
  for (const item of record.cases) {
    if (!item || typeof item !== "object") return null;
    const row = item as { id?: unknown; text?: unknown; expected?: unknown };
    const expected = expectedFields(row.expected);
    if (typeof row.id !== "string" || typeof row.text !== "string" || !expected) return null;
    cases.push({ id: row.id, text: row.text, expected });
  }
  return { lists: { recipients, categories }, cases };
}

function named(value: string | null): string | null {
  if (value === null || value === "none") return null;
  return value;
}

function chosen(answer: unknown): { value: string | null; confidence: number } {
  if (!answer || typeof answer !== "object") return { value: null, confidence: 0 };
  const choice = (answer as { choice?: unknown }).choice;
  const confidence = (answer as { confidence?: unknown }).confidence;
  const score = typeof confidence === "number" ? confidence : 0;
  if (typeof choice !== "string" || score < INTENT_CONFIDENCE_MIN) return { value: null, confidence: score };
  return { value: named(choice), confidence: score };
}

function emptyFields(): Record<SlotEvalField, SlotFieldScore> {
  const byField = {} as Record<SlotEvalField, SlotFieldScore>;
  for (const field of SLOT_EVAL_FIELDS) byField[field] = { correct: 0, missed: 0, confidentWrong: 0 };
  return byField;
}

/** A choice below 0.7 is not taken. A different choice at or above 0.7 is a confident miss. */
export function scoreSlotEval(
  cases: readonly SlotEvalCase[],
  answers: Readonly<Record<string, unknown>>,
): SlotEvalScore {
  const byField = emptyFields();
  let correct = 0;
  let confidentWrong = 0;
  for (const item of cases) {
    const raw = answers[item.id];
    const record = raw && typeof raw === "object" ? raw as Record<string, unknown> : {};
    let rowCorrect = true;
    let rowConfidentWrong = false;
    for (const field of SLOT_EVAL_FIELDS) {
      const got = chosen(record[field]);
      const wanted = named(item.expected[field]);
      if (got.value === wanted) {
        byField[field].correct += 1;
        continue;
      }
      rowCorrect = false;
      if (got.confidence >= INTENT_CONFIDENCE_MIN) {
        byField[field].confidentWrong += 1;
        rowConfidentWrong = true;
      } else {
        byField[field].missed += 1;
      }
    }
    if (rowCorrect) correct += 1;
    if (rowConfidentWrong) confidentWrong += 1;
  }
  return {
    total: cases.length,
    correct,
    missed: cases.length - correct,
    confidentWrong,
    byField,
  };
}
