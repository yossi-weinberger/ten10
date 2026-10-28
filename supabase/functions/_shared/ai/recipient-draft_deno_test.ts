import { recipientFromText } from "./recipient-draft.ts";

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

function check(text: string, saved: readonly string[], expected: { recipient: string; description: string } | null) {
  assertEquals(recipientFromText(text, saved), expected, text);
}

Deno.test("R2 sentences", () => {
  const kollel = "תגדיר לי הוראת קבע של 200 ש״ח לכולל בכל ראש חודש";
  check(kollel, [], null);
  check(kollel, ["כולל"], { recipient: "כולל", description: "תגדיר לי הוראת קבע של 200 ש״ח בכל ראש חודש" });

  check("מעכשיו כל חודש ב־10 תרשום 1,500 שכר דירה", [], null);

  const chabad = "תפתח תרומה קבועה של 36 שקל לחב״ד כל שבוע, ל־12 שבועות";
  const chabadRest = "תפתח תרומה קבועה של 36 שקל כל שבוע, ל־12 שבועות";
  check(chabad, [], { recipient: "חב״ד", description: chabadRest });
  check(chabad, ["חבד"], { recipient: "חבד", description: chabadRest });

  check("Set up a monthly donation of 100 NIS to Ezer Mizion starting next month", [], {
    recipient: "Ezer Mizion",
    description: "Set up a monthly donation of 100 NIS starting next month",
  });

  // "for" is not a recipient marker, and "log" is not a donation word.
  check("From now on log 180 shekels every year on Purim for matanot la'evyonim", [], null);

  // "the" is dropped, as in the data-question recipient reader.
  check("make my fifty dollar pledge to the kollel recurring every month until the end of the year", [], {
    recipient: "kollel",
    description: "make my fifty dollar pledge recurring every month until the end of the year",
  });
});

Deno.test("Hebrew donation with ל", () => {
  check("תרמתי 180 לישיבה", [], { recipient: "ישיבה", description: "תרמתי 180" });
  check("תרמתי 100 ל־ישיבה", [], { recipient: "ישיבה", description: "תרמתי 100" });
  check("תרמתי לישיבה 180 שקל", [], { recipient: "ישיבה", description: "תרמתי 180 שקל" });
  check("תרמתי 100 ל-עזר מציון באשראי", [], { recipient: "עזר מציון", description: "תרמתי 100 באשראי" });
});

Deno.test("a saved recipient keeps its saved spelling", () => {
  check("נתתי 50 לגמ״ח תרופות", ['גמ"ח תרופות'], { recipient: 'גמ"ח תרופות', description: "נתתי 50" });
  check("נתתי 50 לגמ״ח תרופות", [], { recipient: "גמ״ח תרופות", description: "נתתי 50" });
  check('תרמתי 100 לבית חב"ד בפורים', ["בית חב״ד"], { recipient: "בית חב״ד", description: "תרמתי 100 בפורים" });
});

Deno.test("English donation with to", () => {
  check("donated 50 to the yeshiva", [], { recipient: "yeshiva", description: "donated 50" });
  check("gave 20 to Ezer Mizion, cash", [], { recipient: "Ezer Mizion", description: "gave 20, cash" });
});

Deno.test("no recipient", () => {
  check("תרמתי 100 לצדקה", [], null);
  check("donated 50 to charity", [], null);
  check("נתתי לו 50", [], null);
  check("200 לכולל", [], null);
});
