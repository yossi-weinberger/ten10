import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { isReceiptUrl } from "@/lib/ai/receipt-url";

export type OpenReceiptResult = "opened" | "none" | "unavailable";

export async function openAiReceipt(transactionId: string): Promise<OpenReceiptResult> {
  if (!aiCallsAllowed()) return "unavailable";
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
