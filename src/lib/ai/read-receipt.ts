import { supabase } from "@/lib/supabaseClient";
import { blobToBase64 } from "@/lib/ai/blob-base64";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { claimBetaConsentRequired } from "@/lib/ai/beta-consent-required";
import type { ReceiptFields } from "@/lib/ai/receipt-card";
import {
  readReceiptArtifactId,
  readReceiptDraft,
  readReceiptKind,
  RECEIPT_MAX_BASE64_CHARS,
  RECEIPT_MAX_BYTES,
} from "../../../supabase/functions/_shared/ai/receipt-draft.ts";
import { readLimitInfo, type LimitInfo } from "@/lib/ai/limit-reason";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);
const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const RECEIPT_LONG_SIDE = 2000;

export type ReadReceiptResult =
  | { ok: true; route: "receipt"; fields: ReceiptFields; artifactId: string | null }
  | { ok: true; route: "several_receipts" | "statement" }
  | { ok: false; reason: "LIMIT"; limit: LimitInfo }
  | { ok: false; reason: "TOO_LARGE" | "UNREADABLE" | "UNAVAILABLE" | "BETA_CONSENT" };

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

export async function readReceiptImage(file: File, defaultCurrency?: string): Promise<ReadReceiptResult> {
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
  let data = await blobToBase64(prepared);
  if (!data) return { ok: false, reason: "UNREADABLE" };
  if (data.length > RECEIPT_MAX_BASE64_CHARS) {
    if (!image || prepared !== file) return { ok: false, reason: "TOO_LARGE" };
    const shrunk = await shrinkReceiptImage(file);
    if (!shrunk) return { ok: false, reason: "TOO_LARGE" };
    data = await blobToBase64(shrunk);
    if (!data || data.length > RECEIPT_MAX_BASE64_CHARS) return { ok: false, reason: "TOO_LARGE" };
    prepared = shrunk;
  }

  const { data: payload, error } = await supabase.functions.invoke("ai-read-receipt", {
    body: {
      media_type: prepared.type,
      data,
      time_zone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...(defaultCurrency ? { default_currency: defaultCurrency } : {}),
    },
  });
  if (await claimBetaConsentRequired(error, payload)) return { ok: false, reason: "BETA_CONSENT" };
  if (error || !payload || typeof payload !== "object") return { ok: false, reason: "UNAVAILABLE" };
  const limit = readLimitInfo(payload);
  if (limit) return { ok: false, reason: "LIMIT", limit };
  const reason = (payload as { reason?: unknown }).reason;
  if (reason === "too_large") return { ok: false, reason: "TOO_LARGE" };
  if (reason === "unavailable") return { ok: false, reason: "UNAVAILABLE" };
  if (reason === "unreadable") return { ok: false, reason: "UNREADABLE" };
  const raw = (payload as { draft?: unknown }).draft;
  const kind = readReceiptKind(raw);
  if (kind === "several_receipts" || kind === "statement") return { ok: true, route: kind };
  const draft = readReceiptDraft(raw);
  if (!draft) return { ok: false, reason: "UNREADABLE" };
  return {
    ok: true,
    route: "receipt",
    fields: draft,
    artifactId: readReceiptArtifactId((payload as { artifact_id?: unknown }).artifact_id),
  };
}
