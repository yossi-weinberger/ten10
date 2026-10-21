import { supabase } from "@/lib/supabaseClient";

export type OpenReceiptResult = "opened" | "none" | "unavailable";

/** A receipt link is accepted only when it is a signed object URL on this project. */
export function isReceiptUrl(url: string, supabaseUrl: string): boolean {
  const base = supabaseUrl.replace(/\/$/, "");
  return base.startsWith("https://")
    && url.startsWith(`${base}/storage/v1/object/sign/intake-artifacts/`);
}

export async function openAiReceipt(transactionId: string): Promise<OpenReceiptResult> {
  const { data, error } = await supabase.functions.invoke("ai-receipt-url", {
    body: { transaction_id: transactionId },
  });
  if (error || !data || typeof data !== "object") return "unavailable";
  const url = (data as { url?: unknown }).url;
  const projectUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "");
  if (typeof url !== "string" || !isReceiptUrl(url, projectUrl)) {
    return (data as { reason?: unknown }).reason === "none" ? "none" : "unavailable";
  }
  window.open(url, "_blank", "noopener,noreferrer");
  return "opened";
}
