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
  check("אלף ומאתיים שקל", "1200 שקל");
  check("אלף וחצי שקל", "1500 שקל");
  check("מאה וחצי שקל", "150 שקל");
  check("עשרים וחמישה שקל", "25 שקל");
  check("חמישה שקלים", "5 שקלים");
});

Deno.test("Hebrew forms", () => {
  check("אחת עשרה שקל", "11 שקל");
  check("שתים עשרה ש״ח", "12 ש״ח");
  check("שנים עשר דולר", "12 דולר");
  check("חמישה עשר שח", "15 שח");
  check("אחד עשר אלף שקל", "11000 שקל");
  check("עשרים אלף שקל", "20000 שקל");
  check("מאה אלף שקל", "100000 שקל");
  check("אלפיים שקל", "2000 שקל");
  check("עשרת אלפים וחמש מאות שקל", "10500 שקל");
  check("מאתיים חמישים ושש שקל", "256 שקל");
  check("שלוש מאות וחצי שקל", "350 שקל");
  check("לחמישים שקל", "ל־50 שקל");
  check("ומאה שקל", "ו־100 שקל");
});

Deno.test("English amounts", () => {
  check("make my fifty dollar pledge", "make my 50 dollar pledge");
  check("one hundred and twenty shekels", "120 shekels");
  check("two thousand five hundred dollars", "2500 dollars");
  check("twenty-five dollars", "25 dollars");
  check("a hundred dollars", "100 dollars");
  check("A thousand and one dollars", "1001 dollars");
  check("five euros", "5 euros");
  check("ninety nine dollars", "99 dollars");
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

Deno.test("a hyphen joins a Hebrew teen, and missing letters still count", () => {
  check("שתים־עשרה ש״ח", "12 ש״ח");
  check("חמש-עשרה ש״ח", "15 ש״ח");
  check("מאתים שקל", "200 שקל");
  check("שלש מאות שקל", "300 שקל");
  check("שלשים שקל", "30 שקל");
  check("שילמתי מאה", "שילמתי 100");
  check("במאה שערים", "במאה שערים");
});

Deno.test("digits and other text stay byte-identical", () => {
  check("שילמתי 120 שקל", "שילמתי 120 שקל");
  check("  מאה,  שמונים  ", "  מאה,  שמונים  ");
  check("מאה שקל, שמונים דולר", "100 שקל, 80 דולר");
  check("קניתי היום חמישים שקל", "קניתי היום 50 שקל");
});
