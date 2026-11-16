import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { claimBetaConsentRequired } from "@/lib/ai/beta-consent-required";
import { isReceiptUrl } from "@/lib/ai/receipt-url";
import { readLimitInfo, type LimitInfo } from "@/lib/ai/limit-reason";

export type OpenReceiptResult =
  | { status: "opened" }
  | { status: "blocked"; url: string }
  | { status: "none" }
  | { status: "limit"; limit: LimitInfo }
  | { status: "unavailable" }
  | { status: "beta_consent" };

type ReceiptWindow = {
  opener: Window | null;
  location: { href: string };
  close: () => void;
};

function blankWindow(): ReceiptWindow | null {
  if (typeof window === "undefined") return null;
  const opened = window.open("", "_blank");
  if (!opened) return null;
  opened.opener = null;
  return opened;
}

export async function openAiReceipt(
  target: { transactionId: string } | { artifactId: string },
): Promise<OpenReceiptResult> {
  const win = blankWindow();
  if (!aiCallsAllowed()) {
    win?.close();
    return { status: "unavailable" };
  }
  const body = "transactionId" in target
    ? { transaction_id: target.transactionId }
    : { artifact_id: target.artifactId };
  const { data, error } = await supabase.functions.invoke("ai-receipt-url", {
    body,
  });
  if (await claimBetaConsentRequired(error, data)) {
    win?.close();
    return { status: "beta_consent" };
  }
  if (error || !data || typeof data !== "object") {
    win?.close();
    return { status: "unavailable" };
  }
  const limit = readLimitInfo(data);
  if (limit) {
    win?.close();
    return { status: "limit", limit };
  }
  const url = (data as { url?: unknown }).url;
  const projectUrl = String(import.meta.env.VITE_SUPABASE_URL ?? "");
  if (typeof url !== "string" || !isReceiptUrl(url, projectUrl)) {
    win?.close();
    return { status: (data as { reason?: unknown }).reason === "none" ? "none" : "unavailable" };
  }
  if (!win) return { status: "blocked", url };
  win.opener = null;
  win.location.href = url;
  return { status: "opened" };
}
