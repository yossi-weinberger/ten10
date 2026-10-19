import { supabase } from "@/lib/supabaseClient";
import type { ReceiptFields } from "@/lib/ai/receipt-card";
import {
  readReceiptDraft,
  RECEIPT_MAX_BASE64_CHARS,
  RECEIPT_MAX_BYTES,
} from "../../../supabase/functions/_shared/ai/receipt-draft.ts";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

export type ReadReceiptResult =
  | { ok: true; fields: ReceiptFields }
  | { ok: false; reason: "TOO_LARGE" | "UNREADABLE" | "UNAVAILABLE" };

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
  if (file.size > RECEIPT_MAX_BYTES) return { ok: false, reason: "TOO_LARGE" };
  const data = await fileToBase64(file);
  if (!data) return { ok: false, reason: "UNREADABLE" };
  if (data.length > RECEIPT_MAX_BASE64_CHARS) return { ok: false, reason: "TOO_LARGE" };

  const { data: payload, error } = await supabase.functions.invoke("ai-read-receipt", {
    body: { media_type: file.type, data },
  });
  if (error || !payload || typeof payload !== "object") return { ok: false, reason: "UNAVAILABLE" };
  const reason = (payload as { reason?: unknown }).reason;
  if (reason === "too_large") return { ok: false, reason: "TOO_LARGE" };
  if (reason === "unavailable") return { ok: false, reason: "UNAVAILABLE" };
  const draft = readReceiptDraft((payload as { draft?: unknown }).draft);
  if (!draft) return { ok: false, reason: "UNREADABLE" };
  return { ok: true, fields: draft };
}
