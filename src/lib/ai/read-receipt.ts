import { supabase } from "@/lib/supabaseClient";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import { readReceiptDraft } from "../../../supabase/functions/_shared/ai/receipt-draft.ts";

const MAX_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export type ReadReceiptResult =
  | { ok: true; draft: TextTransactionDraft }
  | { ok: false; reason: "TOO_LARGE" | "UNREADABLE" };

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      const comma = value.indexOf(",");
      resolve(comma >= 0 ? value.slice(comma + 1) : "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function readReceiptImage(file: File): Promise<ReadReceiptResult> {
  if (!ALLOWED_TYPES.has(file.type)) return { ok: false, reason: "UNREADABLE" };
  if (file.size > MAX_BYTES) return { ok: false, reason: "TOO_LARGE" };
  const data = await fileToBase64(file);
  if (!data) return { ok: false, reason: "UNREADABLE" };

  const { data: payload, error } = await supabase.functions.invoke("ai-read-receipt", {
    body: { media_type: file.type, data },
  });
  if (error || !payload || typeof payload !== "object") return { ok: false, reason: "UNREADABLE" };
  const draft = readReceiptDraft((payload as { draft?: unknown }).draft);
  if (!draft) return { ok: false, reason: "UNREADABLE" };
  return {
    ok: true,
    draft: {
      date: draft.date,
      amount: draft.amount,
      currency: draft.currency,
      type: "expense",
      requestedRate: null,
      description: draft.description,
      category: null,
      paymentMethod: null,
    },
  };
}
