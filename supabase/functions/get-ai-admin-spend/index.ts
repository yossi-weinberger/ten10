import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { logger } from "../_shared/logger.ts";
import { handleAdminAiSpend, type AdminSpendAuth } from "./handler.ts";
import { isAdminFlag } from "./report.ts";

async function authorize(authHeader: string): Promise<AdminSpendAuth> {
  const userClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userError || !userData.user) return "invalid";
  const { data: adminFlag, error: adminError } = await userClient.rpc("is_admin_user");
  if (adminError || !isAdminFlag(adminFlag)) return "forbidden";
  return "ok";
}

Deno.serve((req) =>
  handleAdminAiSpend(req, {
    authorize,
    apiKey: () => (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim(),
    fetchImpl: fetch,
    logError: (message) => logger.error(message),
  })
);
