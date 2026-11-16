import { useEffect, useReducer } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getPlatform } from "@/lib/platformManager";
import { isAiFeatureFlagEnabled } from "@/lib/ai/flags";
import {
  beginAiAccessFetch,
  completeAiAccessFetch,
  subscribeAiAccessCache,
} from "@/lib/ai/ai-access-cache";

/**
 * Fetch get_my_ai_access once per signed-in web user. Later calls for the same user reuse the cache.
 */
export async function loadAiAccess(): Promise<void> {
  if (getPlatform() !== "web") return;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userId = session?.user?.id;
  if (!userId) return;
  if (!beginAiAccessFetch(userId)) return;
  const { data, error } = await supabase.rpc("get_my_ai_access");
  const allowed =
    !error &&
    data !== null &&
    typeof data === "object" &&
    !Array.isArray(data) &&
    (data as { allowed?: unknown }).allowed === true;
  completeAiAccessFetch(userId, allowed);
}

/**
 * Calls get_my_ai_access once for a signed-in web user when the build flag is on.
 * Sync gates in flags.ts read the cache this fills.
 */
export function useMyAiAccess(signedIn: boolean, platform: string): void {
  const [, rerender] = useReducer((count: number) => count + 1, 0);
  useEffect(() => {
    const unsubscribe = subscribeAiAccessCache(() => {
      rerender();
      if (signedIn && platform === "web" && isAiFeatureFlagEnabled()) {
        void loadAiAccess();
      }
    });
    if (signedIn && platform === "web" && isAiFeatureFlagEnabled()) {
      void loadAiAccess();
    }
    return unsubscribe;
  }, [signedIn, platform]);
}
