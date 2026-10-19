/**
 * Pulls a transaction draft out of text with rules only.
 * Amount and currency stay as written. Nothing is saved.
 */

export interface TextTransactionDraft {
  date: string;
  amount: number;
  currency: "ILS" | "USD" | "EUR";
  type: "expense" | "income" | "donation";
  requestedRate: number | null;
  description: string;
  category: "food" | "transportation" | null;
  paymentMethod: "credit_card" | "cash" | "bank_transfer" | "bit_paybox" | "check" | null;
}

function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function parseNumber(raw: string): number | null {
  const trimmed = raw.trim();
  const thousands = trimmed.match(/^(\d{1,3}(?:,\d{3})+)(?:\.(\d+))?$/);
  if (thousands) {
    const whole = thousands[1].replace(/,/g, "");
    const fraction = thousands[2] ?? "";
    const value = Number(fraction ? `${whole}.${fraction}` : whole);
    return Number.isFinite(value) ? value : null;
  }

  const normalized = trimmed.replace(",", ".");
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function resolveDate(text: string, today: string): string {
  if (text.includes("שלשום")) return addIsoDays(today, -2);
  if (text.includes("אתמול") || text.includes("yesterday")) return addIsoDays(today, -1);
  return today;
}

function resolveCurrency(text: string): TextTransactionDraft["currency"] {
  if (/דולר|dollar|usd|\$/.test(text)) return "USD";
  if (/אירו|euro|eur|€/.test(text)) return "EUR";
  return "ILS";
}

function resolveCategory(text: string): TextTransactionDraft["category"] {
  if (/מאפ|אוכל|סופר|מסעד|food|grocery/.test(text)) return "food";
  if (/מונית|דלק|רכבת|אוטובוס|taxi|fuel/.test(text)) return "transportation";
  return null;
}

function resolvePaymentMethod(text: string): TextTransactionDraft["paymentMethod"] {
  if (/אשראי|credit/.test(text)) return "credit_card";
  if (/מזומן|cash/.test(text)) return "cash";
  if (/העברה|transfer/.test(text)) return "bank_transfer";
  if (/ביט|פייבוקס|paybox|\bbit\b/.test(text)) return "bit_paybox";
  if (/צ['׳]ק|check/.test(text)) return "check";
  return null;
}

function cleanDescription(original: string): string {
  let text = original.replace(/־/g, " ");
  const noise = [
    /לפי\s+שער\s*\d+(?:[.,]\d+)?/gi,
    /(?:שער|rate)\s*\d+(?:[.,]\d+)?/gi,
    /(?:₪|\$)\s*\d+(?:[.,]\d+)?/gi,
    /ב\s*[-–]?\s*\d+(?:[.,]\d+)?(?:\s*(?:ש"?ח|שקלים|שקל|דולר|dollars?|usd|eur|אירו|₪|\$))?/gi,
    /\d+(?:[.,]\d+)?\s*(?:ש"?ח|שקלים|שקל|דולר|dollars?|usd|eur|אירו|₪|\$)/gi,
    /קניתי|שילמתי|קיבלתי|תרמתי|bought|paid|spent|received/gi,
    /שלשום|אתמול|היום|yesterday|today/gi,
    /באשראי|במזומן|בביט|בהעברה|אשראי|מזומן|ביט|פייבוקס|העברה בנקאית/gi,
  ];
  for (const pattern of noise) text = text.replace(pattern, " ");
  const cleaned = text.replace(/\s+/g, " ").replace(/^[\s,.\-–]+|[\s,.\-–]+$/g, "").trim();
  return cleaned || original.trim();
}

function resolveType(text: string): TextTransactionDraft["type"] {
  if (/תרמתי|צדקה|donation|tzedak/.test(text)) return "donation";
  if (/קיבלתי|משכורת|salary|received/.test(text)) return "income";
  return "expense";
}

/** Returns null when the text has no amount. `today` is YYYY-MM-DD in the user's zone. */
export function draftFromText(text: string, today: string): TextTransactionDraft | null {
  const normalized = text.trim().toLowerCase().replace(/־/g, " ").replace(/\s+/g, " ");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;

  const rateMatch = normalized.match(/(?:שער|rate)\s*(\d+(?:,\d+)?(?:\.\d+)?)/);
  const requestedRate = rateMatch ? parseNumber(rateMatch[1]) : null;
  const withoutRate = rateMatch ? normalized.replace(rateMatch[0], " ") : normalized;
  const amountMatch = withoutRate.match(/(\d+(?:,\d{3})+(?:\.\d+)?|\d+(?:[.,]\d+)?)/);
  if (!amountMatch) return null;

  const amount = parseNumber(amountMatch[1]);
  if (amount === null || amount === 0) return null;

  return {
    date: resolveDate(normalized, today),
    amount,
    currency: resolveCurrency(normalized),
    type: resolveType(normalized),
    requestedRate,
    description: cleanDescription(text),
    category: resolveCategory(normalized),
    paymentMethod: resolvePaymentMethod(normalized),
  };
}
