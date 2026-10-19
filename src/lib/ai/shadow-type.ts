import { supabase } from "@/lib/supabaseClient";

export async function recordShadowType(itemId: string, includeType: boolean): Promise<void> {
  await supabase.functions.invoke("ai-shadow-type", {
    body: { item_id: itemId, shadow_type: includeType },
  });
}
