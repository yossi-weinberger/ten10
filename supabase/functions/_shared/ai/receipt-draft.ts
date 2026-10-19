/** Fields read from a receipt image. The model does not choose the transaction type. */

const CURRENCIES = ["ILS", "USD", "EUR"] as const;
type ReceiptCurrency = (typeof CURRENCIES)[number];

export interface ReceiptDraft {
  description: string;
  date: string;
  amount: number;
  currency: ReceiptCurrency;
}

/** Locked vision model. Reads Hebrew and English receipts, including PDFs. */
export const RECEIPT_VISION_MODEL = "anthropic/claude-sonnet-5";

export function receiptFilePart(
  mediaType: string,
  data: string,
):
  | { type: "input_image"; image_url: string }
  | { type: "input_file"; filename: string; file_data: string }
  | null {
  if (mediaType === "application/pdf") {
    return {
      type: "input_file",
      filename: "receipt.pdf",
      file_data: `data:application/pdf;base64,${data}`,
    };
  }
  if (mediaType === "image/jpeg" || mediaType === "image/png" || mediaType === "image/webp") {
    return { type: "input_image", image_url: `data:${mediaType};base64,${data}` };
  }
  return null;
}

export function readModelText(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "";
  const direct = (payload as { output_text?: unknown }).output_text;
  if (typeof direct === "string") return direct;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  const parts: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (typeof (item as { text?: unknown }).text === "string") parts.push((item as { text: string }).text);
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      const text = (block as { text?: unknown }).text;
      if (typeof text === "string") parts.push(text);
    }
  }
  return parts.join("");
}

function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

export function readReceiptDraft(value: unknown): ReceiptDraft | null {
  let record = value;
  if (typeof value === "string") {
    const trimmed = value.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    try {
      record = JSON.parse(trimmed);
    } catch {
      return null;
    }
  }
  if (!record || typeof record !== "object") return null;
  const source = record as {
    description?: unknown;
    date?: unknown;
    amount?: unknown;
    currency?: unknown;
  };
  if (typeof source.description !== "string") return null;
  const description = source.description.trim().slice(0, 200);
  if (description.length < 2) return null;
  if (typeof source.date !== "string" || !isIsoDate(source.date)) return null;
  const amount = typeof source.amount === "number" ? source.amount : Number(source.amount);
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000) return null;
  const currency = typeof source.currency === "string" ? source.currency.trim().toUpperCase() : "";
  if (!CURRENCIES.includes(currency as ReceiptCurrency)) return null;
  return {
    description,
    date: source.date,
    amount,
    currency: currency as ReceiptCurrency,
  };
}
