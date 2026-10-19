import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import { normalizeArrivalCode } from "./arrival-code";
import { readFirstTouch } from "./capture";
import { isRecentAuthUser } from "./recent-user";

export { isRecentAuthUser, RECENT_SIGNUP_WINDOW_MS } from "./recent-user";

/**
 * Best-effort first-touch write for Google OAuth and email-confirm returns.
 * Never throws; a missing/invalid code must not break the session.
 */
export async function applyPersistedAttributionToProfile(
  user: Pick<User, "id" | "created_at">
): Promise<boolean> {
  try {
    if (!isRecentAuthUser(user.created_at)) return false;

    const touch = readFirstTouch();
    const code = normalizeArrivalCode(touch?.code);
    if (!code) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("arrival_code")
      .eq("id", user.id)
      .single();

    if (error || data?.arrival_code) return false;

    const utm = touch?.utm;
    const hasUtm = Boolean(
      utm && (utm.utm_source || utm.utm_medium || utm.utm_campaign)
    );

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        arrival_code: code,
        signup_utm: hasUtm ? utm : null,
        arrival_code_set_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (updateError) {
      logger.error(
        "Failed to persist arrival attribution on profile:",
        updateError
      );
      return false;
    }

    return true;
  } catch (error) {
    logger.error("Failed to persist arrival attribution on profile:", error);
    return false;
  }
}
