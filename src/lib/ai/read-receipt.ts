import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import type { ReceiptFields } from "@/lib/ai/receipt-card";
import {
  readReceiptArtifactId,
  readReceiptDraft,
  RECEIPT_MAX_BASE64_CHARS,
  RECEIPT_MAX_BYTES,
} from "../../../supabase/functions/_shared/ai/receipt-draft.ts";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const RECEIPT_LONG_SIDE = 2000;

export type ReadReceiptResult =
  | { ok: true; fields: ReceiptFields; artifactId: string | null }
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

async function shrinkReceiptImage(file: File): Promise<File | null> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return null;
  const bitmap = await createImageBitmap(file);
  try {
    const longSide = Math.max(bitmap.width, bitmap.height);
    const scale = longSide > RECEIPT_LONG_SIDE ? RECEIPT_LONG_SIDE / longSide : 1;
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.85);
    });
    if (!blob) return null;
    return new File([blob], "receipt.jpg", { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}

export async function readReceiptImage(file: File): Promise<ReadReceiptResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "UNAVAILABLE" };
  if (!ALLOWED_TYPES.has(file.type)) return { ok: false, reason: "UNREADABLE" };
  const image = IMAGE_TYPES.has(file.type);
  let prepared = file;
  if (!image && file.size > RECEIPT_MAX_BYTES) return { ok: false, reason: "TOO_LARGE" };
  if (image && file.size > RECEIPT_MAX_BYTES) {
    const shrunk = await shrinkReceiptImage(file);
    if (!shrunk || shrunk.size > RECEIPT_MAX_BYTES) return { ok: false, reason: "TOO_LARGE" };
    prepared = shrunk;
  }
  let data = await fileToBase64(prepared);
  if (!data) return { ok: false, reason: "UNREADABLE" };
  if (data.length > RECEIPT_MAX_BASE64_CHARS) {
    if (!image || prepared !== file) return { ok: false, reason: "TOO_LARGE" };
    const shrunk = await shrinkReceiptImage(file);
    if (!shrunk) return { ok: false, reason: "TOO_LARGE" };
    data = await fileToBase64(shrunk);
    if (!data || data.length > RECEIPT_MAX_BASE64_CHARS) return { ok: false, reason: "TOO_LARGE" };
    prepared = shrunk;
  }

  const { data: payload, error } = await supabase.functions.invoke("ai-read-receipt", {
    body: { media_type: prepared.type, data },
  });
  if (error || !payload || typeof payload !== "object") return { ok: false, reason: "UNAVAILABLE" };
  const reason = (payload as { reason?: unknown }).reason;
  if (reason === "too_large") return { ok: false, reason: "TOO_LARGE" };
  if (reason === "unavailable") return { ok: false, reason: "UNAVAILABLE" };
  if (reason === "unreadable") return { ok: false, reason: "UNREADABLE" };
  const draft = readReceiptDraft((payload as { draft?: unknown }).draft);
  if (!draft) return { ok: false, reason: "UNREADABLE" };
  return {
    ok: true,
    fields: draft,
    artifactId: readReceiptArtifactId((payload as { artifact_id?: unknown }).artifact_id),
  };
}
