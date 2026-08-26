import { supabase } from "@/lib/supabaseClient";
import { useDonationStore } from "@/lib/store";
import { CURRENT_WHATS_NEW_VERSION } from "@/lib/whats-new-history";
import { logger } from "@/lib/logger";

const WHATS_NEW_SUPPRESS_KEY = "ten10.onboarding.suppress-whats-new";
export const WHATS_NEW_SUPPRESS_EVENT = "ten10:suppress-whats-new";

export function suppressWhatsNewForSession(): void {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(WHATS_NEW_SUPPRESS_KEY, "true");
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WHATS_NEW_SUPPRESS_EVENT));
  }
}

export function isWhatsNewSuppressedForSession(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  return sessionStorage.getItem(WHATS_NEW_SUPPRESS_KEY) === "true";
}

export async function markCurrentWhatsNewSeen(input: {
  platform: "web" | "desktop";
  userId: string | null;
}): Promise<void> {
  suppressWhatsNewForSession();
  useDonationStore.getState().updateSettings({
    lastSeenVersion: CURRENT_WHATS_NEW_VERSION,
  });

  if (input.platform !== "web" || !input.userId) {
    return;
  }

  const { error } = await supabase
    .from("profiles")
    .update({ last_seen_version: CURRENT_WHATS_NEW_VERSION })
    .eq("id", input.userId);

  if (error) {
    logger.error("[onboarding] Failed to mark What's New as seen:", error);
  }
}
