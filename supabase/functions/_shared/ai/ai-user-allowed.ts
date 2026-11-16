import { createClient } from "npm:@supabase/supabase-js@2.116.0";

function safeEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name);
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}

/** Service-role check used by ai-receipt-url. False when the RPC is missing or denied. */
export async function aiUserAllowed(userId: string): Promise<boolean> {
  const serviceKey = (safeEnv("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const supabaseUrl = safeEnv("SUPABASE_URL") ?? "";
  if (!serviceKey || !supabaseUrl) return false;
  const admin = createClient(supabaseUrl, serviceKey);
  const { data, error } = await admin.rpc("ai_user_allowed", { p_user_id: userId });
  return error == null && data === true;
}
