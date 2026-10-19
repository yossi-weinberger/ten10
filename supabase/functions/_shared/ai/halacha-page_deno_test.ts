import { selectHalachaPage } from "./halacha-page.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("a general term selects the published page", () => {
  assert(selectHalachaPage("מה זה הוצאה מוכרת?")?.id === "expenses", "expenses");
  assert(selectHalachaPage("what is chomesh?")?.id === "chomesh", "chomesh");
  assert(selectHalachaPage("מה זה מעשר?")?.id === "tithes", "tithes");
});

Deno.test("a personal ruling does not select a page", () => {
  assert(selectHalachaPage("האם מותר לי לקזז את זה מהמעשר") === null, "personal");
  assert(selectHalachaPage("what is the weather") === null, "unrelated");
});
