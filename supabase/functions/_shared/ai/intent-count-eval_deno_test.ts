import { INTAKE_COUNTS } from "./jev-intent.ts";
import { readLabelEvalCases, scoreLabelEval } from "./intent-count-eval.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function throws(run: () => unknown, message: string): void {
  try {
    run();
  } catch {
    return;
  }
  throw new Error(message);
}

const row = { language: "he", note: "standard", text: "x" };

Deno.test("count eval cases keep the closed labels", () => {
  const cases = readLabelEvalCases([
    { ...row, id: "a", expected: "one" },
    { ...row, id: "b", expected: "several", acceptable: ["list"] },
  ], INTAKE_COUNTS);
  assert(cases.length === 2 && cases[1].acceptable[0] === "list", "read");
  throws(() => readLabelEvalCases([], INTAKE_COUNTS), "empty set");
  throws(() => readLabelEvalCases([{ ...row, id: "a", expected: "two" }], INTAKE_COUNTS), "unknown label");
  throws(() => readLabelEvalCases([{ ...row, id: "a", expected: "one", acceptable: ["many"] }], INTAKE_COUNTS), "acceptable");
  throws(() => readLabelEvalCases([
    { ...row, id: "a", expected: "one" },
    { ...row, id: "a", expected: "one" },
  ], INTAKE_COUNTS), "duplicate id");
  throws(() => readLabelEvalCases([{ ...row, id: "a", language: "fr", expected: "one" }], INTAKE_COUNTS), "language");
});

Deno.test("the count score splits by label and counts confident mistakes", () => {
  const cases = readLabelEvalCases([
    { ...row, id: "a", expected: "one" },
    { ...row, id: "b", expected: "several" },
    { ...row, id: "c", expected: "several", acceptable: ["list"] },
    { ...row, id: "d", expected: "list" },
    { ...row, id: "e", expected: "one" },
  ], INTAKE_COUNTS);
  const summary = scoreLabelEval(cases, {
    a: { choice: "one", confidence: 0.9 },
    b: { choice: "one", confidence: 0.8 },
    c: { choice: "list", confidence: 0.6 },
    d: { choice: "several", confidence: 0.4 },
  }, INTAKE_COUNTS);
  assert(summary.total === 5 && summary.answered === 4, "answered");
  assert(summary.correct === 2, "acceptable counts as correct");
  assert(summary.byLabel.several.total === 2 && summary.byLabel.several.correct === 1, "several");
  assert(summary.byLabel.list.correct === 0 && summary.byLabel.one.correct === 1, "list and one");
  assert(summary.correctConfidence.min === 0.6 && summary.correctConfidence.max === 0.9, "correct bounds");
  assert(summary.wrongConfidence.min === 0.4 && summary.wrongConfidence.max === 0.8, "wrong bounds");
  assert(summary.confidentWrong === 1, "several read as one at 0.8");
  assert(summary.wrongs.map((wrong) => wrong.id).join() === "b,d,e", "unanswered is wrong");
});
