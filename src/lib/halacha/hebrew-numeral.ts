const ONES = ["", "א", "ב", "ג", "ד", "ה", "ו", "ז", "ח", "ט"];
const TENS = ["", "י", "כ", "ל", "מ", "נ", "ס", "ע", "פ", "צ"];
const HUNDREDS = ["", "ק", "ר", "ש", "ת"];

export function toHebrewNumeral(value: number): string {
  if (value <= 0 || !Number.isFinite(value)) {
    return String(value);
  }

  let remaining = Math.floor(value);
  let result = "";

  while (remaining >= 400) {
    result += "ת";
    remaining -= 400;
  }

  result += HUNDREDS[Math.floor(remaining / 100)];
  remaining %= 100;

  if (remaining === 15) return `${result}טו`;
  if (remaining === 16) return `${result}טז`;

  result += TENS[Math.floor(remaining / 10)];
  result += ONES[remaining % 10];
  return result;
}
