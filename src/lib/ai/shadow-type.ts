import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";

export async function recordShadowType(itemId: string, includeType: boolean): Promise<void> {
  if (!aiCallsAllowed()) return;
  await supabase.functions.invoke("ai-shadow-type", {
    body: { item_id: itemId, shadow_type: includeType },
  });
}
