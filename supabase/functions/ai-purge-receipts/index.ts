import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";

const BUCKET = "intake-artifacts";

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { deleted: 0 }, 405);

  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const auth = req.headers.get("Authorization") ?? "";
  if (!serviceKey || !supabaseUrl || auth !== `Bearer ${serviceKey}`) {
    return json(origin, { deleted: 0 }, 401);
  }

  const admin = createClient(supabaseUrl, serviceKey);
  const listed = await admin.rpc("list_expired_receipt_artifacts");
  if (listed.error || !Array.isArray(listed.data)) {
    logger.error("receipt purge list failed");
    return json(origin, { deleted: 0 }, 200);
  }

  const rows = listed.data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const id = (row as { id?: unknown }).id;
    const storagePath = (row as { storage_path?: unknown }).storage_path;
    if (typeof id !== "string" || typeof storagePath !== "string") return [];
    return [{ id, storagePath }];
  });
  if (rows.length === 0) return json(origin, { deleted: 0 }, 200);

  const removed = await admin.storage.from(BUCKET).remove(rows.map((row) => row.storagePath));
  if (removed.error || !Array.isArray(removed.data)) {
    logger.error("receipt purge delete failed");
    return json(origin, { deleted: 0 }, 200);
  }
  const removedPaths = new Set(removed.data.map((item) => item.name));
  const ids = rows.filter((row) => removedPaths.has(row.storagePath)).map((row) => row.id);
  if (ids.length === 0) return json(origin, { deleted: 0 }, 200);

  const marked = await admin.rpc("mark_receipt_artifacts_deleted", { p_ids: ids });
  if (marked.error) {
    logger.error("receipt purge mark failed");
    return json(origin, { deleted: 0 }, 200);
  }
  return json(origin, { deleted: typeof marked.data === "number" ? marked.data : ids.length }, 200);
});
