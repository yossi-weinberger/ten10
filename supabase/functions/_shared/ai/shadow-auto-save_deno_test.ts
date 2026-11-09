import { evaluateShadowAutoSave } from "./shadow-auto-save.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const ready = {
  expense: true,
  sameCurrency: true,
  explicit: true,
  known: true,
  duplicate: false,
  decideAvailable: false,
};

Deno.test("a ready expense is measured but not auto-saved while decide() is off", () => {
  const result = evaluateShadowAutoSave(ready);
  assert(result.eligibleWithoutModel, "cohort");
  assert(!result.wouldAutoSave, "save stays off");
  assert(result.blockedBy.length === 1 && result.blockedBy[0] === "DECIDE_UNAVAILABLE", "only the model gate");
});

Deno.test("income, a foreign amount, or a duplicate is outside the cohort", () => {
  assert(!evaluateShadowAutoSave({ ...ready, expense: false }).eligibleWithoutModel, "income");
  assert(!evaluateShadowAutoSave({ ...ready, sameCurrency: false }).eligibleWithoutModel, "currency");
  assert(!evaluateShadowAutoSave({ ...ready, duplicate: true }).eligibleWithoutModel, "duplicate");
});

Deno.test("the full gate opens only when decide() is connected and every check passes", () => {
  const result = evaluateShadowAutoSave({ ...ready, decideAvailable: true });
  assert(result.wouldAutoSave, "full gate");
  assert(result.blockedBy.length === 0, "no blockers");
});
