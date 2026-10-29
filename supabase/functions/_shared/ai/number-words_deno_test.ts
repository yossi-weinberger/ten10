import { numberWordsToDigits } from "./number-words.ts";

function check(text: string, expected: string): void {
  const actual = numberWordsToDigits(text);
  if (actual !== expected) throw new Error(`${text}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
}

Deno.test("Hebrew amounts", () => {
  check("תרמתי מאה שמונים שקל לישיבה אתמול", "תרמתי 180 שקל לישיבה אתמול");
  check("קניתי בסופר בשלוש מאות ארבעים ושתיים שקל", "קניתי בסופר ב־342 שקל");
  check(
    "קיבלתי משכורת תשעת אלפים שקל ונתתי תשע מאות שקל למעשר",
    "קיבלתי משכורת 9000 שקל ונתתי 900 שקל למעשר",
  );
  check("חמש מאות שקל שכר לימוד", "500 שקל שכר לימוד");
  check("אלף ומאתיים", "1200");
  check("אלף וחצי", "1500");
  check("מאה וחצי", "150");
  check("עשרים וחמישה שקל", "25 שקל");
  check("חמישה שקלים", "5 שקלים");
});

Deno.test("Hebrew forms", () => {
  check("אחת עשרה שקל", "11 שקל");
  check("שתים עשרה ש״ח", "12 ש״ח");
  check("שנים עשר דולר", "12 דולר");
  check("חמישה עשר שח", "15 שח");
  check("אחד עשר אלף", "11000");
  check("עשרים אלף", "20000");
  check("מאה אלף", "100000");
  check("אלפיים", "2000");
  check("עשרת אלפים וחמש מאות", "10500");
  check("מאתיים חמישים ושש", "256");
  check("שלוש מאות וחצי", "350");
  check("לחמישים", "ל־50");
  check("ומאה", "ו־100");
});

Deno.test("English amounts", () => {
  check("make my fifty dollar pledge", "make my 50 dollar pledge");
  check("one hundred and twenty shekels", "120 shekels");
  check("two thousand five hundred", "2500");
  check("twenty-five dollars", "25 dollars");
  check("a hundred", "100");
  check("A thousand and one", "1001");
  check("five euros", "5 euros");
  check("ninety nine", "99");
});

Deno.test("numbers that are not amounts stay as words", () => {
  check("ביום שני קניתי", "ביום שני קניתי");
  check("יום שני מאה שקל", "יום שני 100 שקל");
  check("ביום שלישי", "ביום שלישי");
  check("פעם אחת", "פעם אחת");
  check("שלוש חולצות", "שלוש חולצות");
  check("שני ספרים", "שני ספרים");
  check("שלוש שנים", "שלוש שנים");
  check("for one month", "for one month");
  check("היו לי שלוש קניות: אחת ב־100", "היו לי שלוש קניות: אחת ב־100");
  check("מאות שקלים", "מאות שקלים");
  check("twenty-something", "twenty-something");
});

Deno.test("digits and other text stay byte-identical", () => {
  check("שילמתי 120 שקל", "שילמתי 120 שקל");
  check("  מאה,  שמונים  ", "  100,  80  ");
  check("קניתי היום חמישים שקל", "קניתי היום 50 שקל");
});
