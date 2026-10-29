import { amountsFromText, clarificationField, currencyAmountsFromText, draftFromText } from "./text-draft.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-19";

Deno.test("a shekel purchase becomes an expense dated today", () => {
  const draft = draftFromText("קניתי ספרים ב-120 שקל", TODAY);
  assert(draft !== null, "expected a draft");
  assert(draft.amount === 120, "amount");
  assert(draft.currency === "ILS", "currency");
  assert(draft.type === "expense", "type");
  assert(draft.date === TODAY, "date");
  assert(draft.requestedRate === null, "no manual rate");
});

Deno.test("yesterday and a manual dollar rate stay on the draft", () => {
  const draft = draftFromText("אתמול קיבלתי 200 דולר לפי שער 3.5", TODAY);
  assert(draft !== null, "expected a draft");
  assert(draft.amount === 200, "amount is the dollars, not the rate");
  assert(draft.currency === "USD", "currency");
  assert(draft.type === "income", "received is income");
  assert(draft.date === "2026-10-18", "yesterday");
  assert(draft.requestedRate === 3.5, "manual rate");
});

Deno.test("the description keeps the purchase, not the command or the amount", () => {
  const draft = draftFromText("קניתי מאפים באליס ב-15 שח", TODAY);
  assert(draft !== null, "expected a draft");
  assert(draft.description === "מאפים באליס", "description");
  assert(draft.amount === 15, "amount");
  assert(draft.category === "food", "bakery is food");
});

Deno.test("shekel abbreviations leave the description", () => {
  for (const text of ["קניתי מאפים ב-15 ש\"ח", "קניתי מאפים ב-15 ש״ח", "קניתי מאפים ב-15 שח"]) {
    const draft = draftFromText(text, TODAY);
    assert(draft?.description === "מאפים", text);
    assert(draft?.amount === 15, "amount");
    assert(draft?.currency === "ILS", "shekel");
  }
});

Deno.test("text without an amount is not a draft", () => {
  assert(draftFromText("מה אפשר לעשות", TODAY) === null, "help has no amount");
});

Deno.test("a clear purchase does not need a question", () => {
  assert(clarificationField("קניתי מאפים ב-15 שח", TODAY) === null, "complete");
});

Deno.test("an amount without a verb asks for the type first", () => {
  assert(clarificationField("מאפים ב-15 שח", TODAY) === "type", "type before amount");
});

Deno.test("a verb without an amount asks for the amount", () => {
  assert(clarificationField("קניתי מאפים", TODAY) === "amount", "amount");
});

Deno.test("an English grocery purchase uses the same alias lists", () => {
  const draft = draftFromText("day before yesterday I bought groceries for 15 dollars", TODAY);
  assert(draft !== null, "expected a draft");
  assert(draft.amount === 15, "amount");
  assert(draft.currency === "USD", "dollars");
  assert(draft.type === "expense", "bought");
  assert(draft.category === "food", "groceries");
  assert(draft.date === "2026-10-17", "day before yesterday");
  assert(draft.description.includes("groceries"), "keeps the item");
  assert(!draft.description.includes("bought"), "drops the verb");
  assert(!draft.description.includes("15"), "drops the amount");
});

Deno.test("an English sentence keeps the purchase, not the command", () => {
  const draft = draftFromText("I bought pastries at Alice for 15 shekels", TODAY);
  assert(draft !== null && draft.description === "pastries at Alice", "description");
  assert(draft?.currency === "ILS", "shekels");
});

Deno.test("a model number is not the price", () => {
  const phone = draftFromText("קניתי אייפון 15 ב 3000", TODAY);
  assert(phone?.amount === 3000, "price, not the model");
  assert(phone?.description === "אייפון 15", "model number stays");

  const loaves = draftFromText("קניתי 3 לחמים ב 20", TODAY);
  assert(loaves?.amount === 20, "price, not the count");
  assert(loaves?.description === "3 לחמים", "count stays in the name");

  const paper = draftFromText("מחברת A4 ב 12", TODAY);
  assert(paper?.amount === 12, "price, not the size");
  assert(paper?.description === "מחברת A4", "glued digits stay");

  const english = draftFromText("bought bread 20", TODAY);
  assert(english?.amount === 20, "last number");
  assert(english?.description === "bread", "item stays");

  const tax = draftFromText("ארנונה 1,250", TODAY);
  assert(tax?.amount === 1250, "thousands separators");
  assert(tax?.description === "ארנונה", "name stays");
});

Deno.test("a comma after the verb and a bare amount leave the description", () => {
  const comma = draftFromText("קניתי, לחם 20", TODAY);
  assert(comma?.type === "expense", "bought");
  assert(comma?.amount === 20, "amount");
  assert(comma?.description === "לחם", "verb and comma leave");
  assert(draftFromText("קניתי לחם 20", TODAY)?.description === "לחם", "bare amount leaves");
});

Deno.test("a donation to charity does not keep the prefix letter", () => {
  const draft = draftFromText("תרמתי לצדקה 100", TODAY);
  assert(draft?.type === "donation", "donation");
  assert(draft?.amount === 100, "amount");
  assert(draft?.description === "", "ל from לצדקה is not a description");
});

Deno.test("a bare amount is not stored as the description", () => {
  assert(draftFromText("שילמתי 5000", TODAY)?.description === "", "bare number");
  assert(draftFromText("קניתי 100 ל", TODAY)?.description === "", "stray letter");
});

Deno.test("donated is a donation and does not ask for the type", () => {
  const text = "last friday I donated 50 dollars";
  assert(clarificationField(text, TODAY) === null, "type is known");
  const draft = draftFromText(text, TODAY);
  assert(draft?.type === "donation", "donation");
  assert(draft?.amount === 50, "amount");
  assert(draft?.currency === "USD", "dollars");
  assert(draft?.date === "2026-10-16", "last friday");
});

Deno.test("last weekday is the previous one, and today rolls back a week", () => {
  const sunday = draftFromText("ביום ראשון שעבר קניתי לחם ב-10", TODAY);
  const monday = draftFromText("last monday I bought bread for 10", TODAY);
  assert(sunday !== null && sunday.date === "2026-10-18", "last Sunday before Monday");
  assert(monday !== null && monday.date === "2026-10-12", "last Monday is a week ago");
  assert(sunday !== null && !sunday.description.includes("ראשון"), "date phrase leaves the description");
});

function sameAmounts(text: string, expected: number[]): void {
  const found = amountsFromText(text);
  assert(JSON.stringify(found) === JSON.stringify(expected), `${text}: ${JSON.stringify(found)}`);
}

Deno.test("every amount is listed, marked or bare", () => {
  sameAmounts("50 במכולת ו־120 לישיבה", [50, 120]);
  sameAmounts("50 ש\"ח במכולת ו־120 לישיבה", [50, 120]);
  sameAmounts("spent 40 on lunch and 25 on coffee", [40, 25]);
  sameAmounts("20 לקפה, 35 לאוטובוס", [20, 35]);
  sameAmounts("$50 groceries and $120 yeshiva", [50, 120]);
  sameAmounts("50 לכולל", [50]);
  sameAmounts("תרמתי מאה שמונים לישיבה ושילמתי חמישים במכולת", [180, 50]);
  sameAmounts("במאה שערים", []);
  sameAmounts("1,234.56 בסופר", [1234.56]);
  sameAmounts("תרמתי 2000 לישיבה", [2000]);
  sameAmounts("אתמול קיבלתי 200 דולר לפי שער 3.5", [200]);
  sameAmounts("Donated 100 ILS to the kollel", [100]);
});

Deno.test("a quantity or a model number next to a price is not an amount", () => {
  sameAmounts("קניתי 2 חולצות ב־100", [100]);
  sameAmounts("קניתי 3 לחמים ב 20", [20]);
  sameAmounts("קניתי אייפון 15 ב 3000", [3000]);
});

Deno.test("times, years and days of the month are not amounts", () => {
  const cases: [string, number][] = [
    ["ב־15 לחודש קניתי 200 שקל", 200],
    ["ב-15 לחודש ירדו 450", 450],
    ["ב–15 לחודש ירדו 450", 450],
    ["קניתי חלב ב־10:30 ב־12 שקל", 12],
    ["בשנת 2025 תרמתי 300", 300],
    ["in 2024 I donated 500", 500],
    ["ב־15 באוקטובר 2025 קניתי ב־80", 80],
    ["קניתי ב־15.10.2025 מחשב ב־3,000", 3000],
    ["on the 15th I paid 200 for rent", 200],
    ["October 15 I paid 90", 90],
    ["מעכשיו כל חודש ב־10 תרשום 1,500 שכר דירה", 1500],
  ];
  for (const [text, amount] of cases) {
    sameAmounts(text, [amount]);
    assert(draftFromText(text, TODAY)?.amount === amount, `${text}: draft amount`);
  }
});

Deno.test("an amount right after a monthly phrase stays an amount", () => {
  sameAmounts("כל חודש ב־100 ש\"ח לישיבה", [100]);
  sameAmounts("כל חודש ב־50 לישיבה", [50]);
});

Deno.test("the amount beside a currency wins over counts, shares and head counts", () => {
  const cases: [string, number, string][] = [
    ["קניתי מקרר ב-3000 שקל ב-3 תשלומים", 3000, "ILS"],
    ["קניתי מקרר ב־3 תשלומים של 900 שקל", 900, "ILS"],
    ["ארוחה ל-5 אנשים ב-400 שקל", 400, "ILS"],
    ["קניתי כרטיס טיסה ב־420 יורו ב־3.5", 420, "EUR"],
    ["Paid 320 euros for a family room for 4 nights", 320, "EUR"],
    ["קניתי במכולת ב-50 שקל", 50, "ILS"],
    ["ב־15 לחודש קניתי 200 שקל", 200, "ILS"],
  ];
  for (const [text, amount, currency] of cases) {
    const draft = draftFromText(text, TODAY);
    assert(draft?.amount === amount, `${text}: amount ${draft?.amount}`);
    assert(draft?.currency === currency, `${text}: currency ${draft?.currency}`);
  }
});

Deno.test("a share of an amount is computed: 10 אחוז מ־500 is 50", () => {
  assert(draftFromText("תרמתי 10 אחוז מ-500 שקל", TODAY)?.amount === 50, "hebrew");
  assert(draftFromText("donated 10% of 500 shekels", TODAY)?.amount === 50, "english");
});

Deno.test("a total split in parts is one payment of the total", () => {
  assert(draftFromText("Paid $250 for the hotel, $100 cash and $150 by credit card", TODAY)?.amount === 250, "english");
  assert(draftFromText("שילמתי 300 על קניות, 100 במזומן ו־200 באשראי", TODAY)?.amount === 300, "hebrew");
  assert(amountsFromText("שילמתי 300 על קניות, 100 במזומן ו־200 באשראי").length === 1, "one amount");
});

Deno.test("only amounts beside a currency are currency amounts", () => {
  assert(currencyAmountsFromText("50 שקל במכולת ו־120 שקל לישיבה").length === 2, "two");
  assert(currencyAmountsFromText("קניתי מקרר ב-3000 שקל ב-3 תשלומים").length === 1, "one");
  assert(currencyAmountsFromText("50 במכולת ו-120 לישיבה").length === 0, "bare");
});