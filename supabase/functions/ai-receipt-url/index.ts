import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { aiUserAllowed } from "../_shared/ai/ai-user-allowed.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { requireAiUser } from "../_shared/ai/require-ai-user.ts";

const BUCKET = "intake-artifacts";
const URL_SECONDS = 300;

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const body = await req.json().catch(() => null) as {
    transaction_id?: unknown;
    artifact_id?: unknown;
  } | null;
  const transactionId = typeof body?.transaction_id === "string" ? body.transaction_id : "";
  const artifactId = typeof body?.artifact_id === "string" ? body.artifact_id : "";
  // A receipt already saved on a transaction stays viewable when AI is off or the trial ends.
  // Draft artifact URLs are an AI call and still require current beta consent.
  const savedReceipt = transactionId !== "" && artifactId === "";
  const setup = await requireAiUser(req, {
    methodNotAllowedBody: { url: null },
    skipEnabledCheck: true,
    skipAllowedCheck: true,
    skipConsentCheck: savedReceipt,
  });
  if (!setup.ok) return setup.response;
  const { userId, origin } = setup;

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();

  if ((!savedReceipt && (!isAiIntakeEnabled() || !(await aiUserAllowed(userId)))) || !serviceKey || !supabaseUrl) {
    return json(origin, { url: null, reason: "unavailable" }, 200);
  }
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if ((transactionId && artifactId) || (!uuid.test(transactionId) && !uuid.test(artifactId))) {
    return json(origin, { url: null, reason: "none" }, 200);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const found = transactionId
    ? await admin.rpc("receipt_storage_path", {
      p_user_id: userId,
      p_transaction_id: transactionId,
    })
    : await admin.rpc("receipt_artifact_path", {
      p_user_id: userId,
      p_artifact_id: artifactId,
    });
  const path = typeof found.data === "string" ? found.data : "";
  const prefix = `${userId.toLowerCase()}/`;
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
