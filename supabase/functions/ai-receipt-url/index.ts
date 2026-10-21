import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";

const BUCKET = "intake-artifacts";
const URL_SECONDS = 300;

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { url: null }, 405);
  if (!isAiIntakeEnabled()) return json(origin, { url: null, reason: "unavailable" }, 200);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(origin, { error: "Missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const userClient = createClient(
    supabaseUrl,
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await userClient.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (userError || !userData.user) return json(origin, { error: "Invalid token" }, 401);
  if (!isTrialUser(userData.user.id) || !serviceKey || !supabaseUrl) {
    return json(origin, { url: null, reason: "unavailable" }, 200);
  }

  const body = await req.json().catch(() => null) as {
    transaction_id?: unknown;
    artifact_id?: unknown;
  } | null;
  const transactionId = typeof body?.transaction_id === "string" ? body.transaction_id : "";
  const artifactId = typeof body?.artifact_id === "string" ? body.artifact_id : "";
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if ((transactionId && artifactId) || (!uuid.test(transactionId) && !uuid.test(artifactId))) {
    return json(origin, { url: null, reason: "none" }, 200);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const found = transactionId
    ? await admin.rpc("receipt_storage_path", {
      p_user_id: userData.user.id,
      p_transaction_id: transactionId,
    })
    : await admin.rpc("receipt_artifact_path", {
      p_user_id: userData.user.id,
      p_artifact_id: artifactId,
    });
  const path = typeof found.data === "string" ? found.data : "";
  const prefix = `${userData.user.id.toLowerCase()}/`;
  if (found.error || !path.startsWith(prefix) || path.includes("..")) {
    if (found.error) logger.error("receipt url lookup failed");
    return json(origin, { url: null, reason: "none" }, 200);
  }

  const signed = await admin.storage.from(BUCKET).createSignedUrl(path, URL_SECONDS);
  if (signed.error || !signed.data?.signedUrl) {
    logger.error("receipt url sign failed");
    return json(origin, { url: null, reason: "unavailable" }, 200);
  }
  return json(origin, { url: signed.data.signedUrl }, 200);
});
