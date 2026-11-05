import { readerCategories } from "./split-lists.ts";
import { SPLIT_JSON_SCHEMA } from "./split-schema.ts";
import { buildIntentBody, readChomeshChoice } from "./jev-intent.ts";
import { withChomesh } from "./split-anchor.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

// QA 2026-11-03: "טיפול במוסך 500 תחבורה" saved with no category, because the reader saw only categories already used.
Deno.test("the reader sees the built-in categories even before the user used one", () => {
  const categories = readerCategories([{ category: "food" }], [{ category: "חוג" }]);
  assert(categories.includes("transportation"), "transportation");
  assert(categories.includes("salary"), "salary");
  assert(categories.includes("חוג"), "the user's own");
  assert(new Set(categories).size === categories.length, "no repeats");
  const many = Array.from({ length: 100 }, (_, index) => ({ category: `c${index}` }));
  assert(readerCategories(many, []).includes("transportation"), "built-ins survive the cut at 80");
});

// QA: "תוציא גם חומש" was not marked. Jev answers it; the reader's schema stays as it was.
Deno.test("chomesh is Jev's question, and only a confident ask marks the income items", () => {
  const items = (SPLIT_JSON_SCHEMA.properties.items.items as { required: string[] }).required;
  assert(!items.includes("chomesh"), "the reader has no chomesh field");
  assert("chomesh" in buildIntentBody("קיבלתי משכורת 8000, תוציא גם חומש").questions, "Jev is asked");
  const answer = (choice: string, confidence: number) => ({ answers: { chomesh: { choice, confidence } } });
  assert(readChomeshChoice(answer("asked", 0.9)), "asked");
  assert(!readChomeshChoice(answer("asked", 0.5)), "unsure leaves the setting");
  assert(!readChomeshChoice(answer("not_asked", 0.99)), "not asked");
  assert(!readChomeshChoice(null), "no answer");
  const marked = withChomesh([{ typeHint: "income" }, { typeHint: "expense" }], true);
  assert(marked[0]?.chomesh === true && marked[1]?.chomesh === undefined, "only the income item");
  assert(withChomesh([{ typeHint: "income" }], false)[0]?.chomesh === undefined, "not asked, not marked");
});

// Eval 2026-11-05: "inheritance" and "gift" as a type_question failed the whole read as unreadable.
Deno.test("an off-list type_question is no question, and the read still parses", async () => {
  const { parseSplitPayload } = await import("./split-response.ts");
  const item = {
    amount: 1200, amount_text: "1,200", currency: "ILS", requested_rate: null, date: null, date_text: null,
    type: "income", type_question: "inheritance", recurrence: null, description: "ירושה", is_total: false,
    unsupported_frequency: false, payment_method: null, category: null, rule_id: null,
  };
  const parsed = parseSplitPayload({ items: [item], more_than_five: false, rule: null, question: null, continues: false, discards: false });
  assert(parsed !== null, "parses");
  assert(parsed.items[0]?.type_question === null, "no special question");
  assert(parsed.items[0]?.amount === 1200, "amount kept");
  const valid = parseSplitPayload({ items: [{ ...item, type_question: "exempt-income" }] });
  assert(valid?.items[0]?.type_question === "exempt-income", "a listed value is kept");
});
