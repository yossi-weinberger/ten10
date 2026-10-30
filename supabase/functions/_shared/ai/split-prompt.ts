/** The extraction request. The model is chosen by the split eval, not here. */

export const SPLIT_RESPONSES_URL = "https://ai-gateway.vercel.sh/v1/responses";

/** Measured on split-eval-cases.json. Replaced if another model scores higher. */
export const SPLIT_MODEL = "anthropic/claude-sonnet-5";

export function splitPrompt(text: string, today: string): string {
  return [
    "Split the message into separate transactions.",
    "Reply with JSON only, no markdown.",
    '{"items":[{"description":"","amount":0,"amount_text":"","currency":"ILS","date_phrase":"","type_hint":"expense"}]}',
    "amount is a positive number.",
    "amount_text is copied from the message, not rewritten as digits.",
    "If the amount is written in words, amount_text is those words.",
    "currency is ILS, USD, or EUR, or an empty string when the message names no currency.",
    "date_phrase is the date words exactly as written, or an empty string when no date was said.",
    "type_hint is income, expense, donation, or an empty string.",
    "description is the payee or what was bought, in the message language. Do not translate.",
    "Do not invent an amount that is not written.",
    "If the message has more than 5 transactions, list every one. Do not stop at 5.",
    `Today is ${today}.`,
    "Message:",
    text,
  ].join("\n");
}
