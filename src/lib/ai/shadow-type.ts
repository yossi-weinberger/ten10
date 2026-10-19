import { supabase } from "@/lib/supabaseClient";

export async function recordShadowType(itemId: string): Promise<void> {
  await supabase.functions.invoke("ai-shadow-type", {
    body: { item_id: itemId },
  });
}
