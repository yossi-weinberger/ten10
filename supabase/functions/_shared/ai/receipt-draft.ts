/** Fields read from a receipt image. The model does not choose the transaction type. */

const CURRENCIES = ["ILS", "USD", "EUR"] as const;

/** Base64 of a larger file is rejected. The client uses the same byte ceiling. */
export const RECEIPT_MAX_BASE64_CHARS = 5_500_000;
export const RECEIPT_MAX_BYTES = Math.floor(RECEIPT_MAX_BASE64_CHARS / 4) * 3;
type ReceiptCurrency = (typeof CURRENCIES)[number];

export interface ReceiptDraft {
  description: string;
  date: string;
  amount: number;
  currency: ReceiptCurrency;
}

/** Locked vision model. Reads Hebrew and English receipts, including PDFs. */
export const RECEIPT_VISION_MODEL = "anthropic/claude-sonnet-5";

const ARTIFACT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Private bucket path: user id, UTC year, UTC month, artifact id. No original filename. */
export function receiptStoragePath(userId: string, artifactId: string, receivedAt: Date): string | null {
  const user = userId.toLowerCase();
  const artifact = artifactId.toLowerCase();
  if (!ARTIFACT_ID.test(user) || !ARTIFACT_ID.test(artifact)) return null;
  const year = String(receivedAt.getUTCFullYear());
  const month = String(receivedAt.getUTCMonth() + 1).padStart(2, "0");
  return `${user}/${year}/${month}/${artifact}`;
}

export function decodeReceiptBase64(data: string): Uint8Array | null {
  if (data.length === 0 || data.length % 4 !== 0) return null;
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(data)) return null;
  try {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  } catch {
    return null;
  }
}

/** Declared type must match the file header. A renamed file is not stored or sent. */
export function receiptMagicMatches(mediaType: string, bytes: Uint8Array): boolean {
  if (mediaType === "image/jpeg") {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mediaType === "image/png") {
    return bytes.length >= 8
      && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
      && bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
  }
  if (mediaType === "image/webp") {
    return bytes.length >= 12
      && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
      && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  }
  if (mediaType === "application/pdf") {
    return bytes.length >= 5
      && bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46
      && bytes[4] === 0x2d;
  }
  return false;
}

export async function receiptSha256(bytes: Uint8Array): Promise<string> {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const digest = await crypto.subtle.digest("SHA-256", copy);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function readStoredReceiptPath(value: unknown): { storagePath: string; alreadyStored: boolean } | null {
  if (!value || typeof value !== "object") return null;
  const storagePath = (value as { storage_path?: unknown }).storage_path;
  if (typeof storagePath !== "string" || storagePath.length === 0) return null;
  return {
    storagePath,
    alreadyStored: (value as { already_stored?: unknown }).already_stored === true,
  };
}

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

export function isIsoDate(value: string): boolean {
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
