import { INTENT_CONFIDENCE_MIN } from "./jev-intent.ts";

export interface LabelEvalCase<T extends string> {
  id: string;
  text: string;
  expected: T;
  acceptable: T[];
}

export interface EvalAnswer {
  choice: string | null;
  confidence: number | null;
}

interface Bounds {
  min: number | null;
  max: number | null;
}

export interface LabelEvalSummary<T extends string> {
  total: number;
  answered: number;
  correct: number;
  accuracy: number;
  byLabel: Record<T, { total: number; correct: number }>;
  correctConfidence: Bounds;
  wrongConfidence: Bounds;
  confidentWrong: number;
  wrongs: { id: string; expected: T; choice: string | null; confidence: number | null }[];
}

/** Throws on the first case that does not match `{ id, language, note, text, expected, acceptable? }`. */
export function readLabelEvalCases<T extends string>(raw: unknown, labels: readonly T[]): LabelEvalCase<T>[] {
  if (!Array.isArray(raw) || raw.length === 0) throw new Error("eval cases must be a non-empty array");
  const ids = new Set<string>();
  const isLabel = (value: unknown): value is T => typeof value === "string" && labels.includes(value as T);
  return raw.map((item, index) => {
    const row = item as Record<string, unknown> | null;
    const where = typeof row?.id === "string" ? row.id : `case ${index}`;
    if (!row || typeof row.id !== "string" || ids.has(row.id)) throw new Error(`${where}: missing or duplicate id`);
    ids.add(row.id);
    if (row.language !== "he" && row.language !== "en") throw new Error(`${where}: language must be he or en`);
    if (typeof row.note !== "string") throw new Error(`${where}: note must be a string`);
    if (typeof row.text !== "string" || !row.text.trim()) throw new Error(`${where}: empty text`);
    if (!isLabel(row.expected)) throw new Error(`${where}: expected must be one of ${labels.join(", ")}`);
    const acceptable = row.acceptable ?? [];
    if (!Array.isArray(acceptable) || !acceptable.every(isLabel)) {
      throw new Error(`${where}: acceptable must list labels from ${labels.join(", ")}`);
    }
    return { id: row.id, text: row.text, expected: row.expected, acceptable };
  });
}

function bounds(values: number[]): Bounds {
  if (values.length === 0) return { min: null, max: null };
  return { min: Math.min(...values), max: Math.max(...values) };
}

export function scoreLabelEval<T extends string>(
  cases: LabelEvalCase<T>[],
  answers: Record<string, EvalAnswer>,
  labels: readonly T[],
): LabelEvalSummary<T> {
  const byLabel = Object.fromEntries(labels.map((label) => [label, { total: 0, correct: 0 }])) as Record<
    T,
    { total: number; correct: number }
  >;
  const correctValues: number[] = [];
  const wrongValues: number[] = [];
  const wrongs: LabelEvalSummary<T>["wrongs"] = [];
  let answered = 0;
  let confidentWrong = 0;
  for (const item of cases) {
    const answer = answers[item.id] ?? { choice: null, confidence: null };
    byLabel[item.expected].total += 1;
    if (answer.choice !== null) answered += 1;
    const matched = answer.choice === item.expected || item.acceptable.some((label) => label === answer.choice);
    if (matched) {
      byLabel[item.expected].correct += 1;
      if (answer.confidence !== null) correctValues.push(answer.confidence);
      continue;
    }
    wrongs.push({ id: item.id, expected: item.expected, choice: answer.choice, confidence: answer.confidence });
    if (answer.confidence === null) continue;
    wrongValues.push(answer.confidence);
    if (answer.confidence >= INTENT_CONFIDENCE_MIN) confidentWrong += 1;
  }
  const correct = cases.length - wrongs.length;
  return {
    total: cases.length,
    answered,
    correct,
    accuracy: cases.length === 0 ? 0 : correct / cases.length,
    byLabel,
    correctConfidence: bounds(correctValues),
    wrongConfidence: bounds(wrongValues),
    confidentWrong,
    wrongs,
  };
}
