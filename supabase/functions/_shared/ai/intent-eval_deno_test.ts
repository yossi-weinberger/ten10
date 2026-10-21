import intentCases from "./fixtures/intent-eval-cases.json" with { type: "json" };
import { INTAKE_INTENTS } from "./intent.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("the intent eval set covers both languages and closed labels", () => {
  assert(intentCases.length >= 50 && intentCases.length <= 100, "size");
  const labels = new Set<string>(INTAKE_INTENTS);
  const languages = new Set<string>();
  const expected = new Set<string>();
  let injections = 0;
  const ids = new Set<string>();
  for (const item of intentCases) {
    assert(!ids.has(item.id), `duplicate ${item.id}`);
    ids.add(item.id);
    assert(item.language === "he" || item.language === "en", item.id);
    assert(item.text.trim().length > 0, item.id);
    assert(labels.has(item.expected), `${item.id} label`);
    languages.add(item.language);
    expected.add(item.expected);
    if (item.note === "prompt-injection") injections += 1;
  }
  assert(languages.has("he") && languages.has("en"), "both languages");
  assert(injections >= 4, "injection attempts");
  for (const label of INTAKE_INTENTS) {
    assert(expected.has(label), `missing ${label}`);
  }
});
