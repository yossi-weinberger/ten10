import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { JEV_SYSTEMONE_URL } from "../_shared/ai/jev-duplicate-rank.ts";
import { buildIntentBody, readIntentChoice } from "../_shared/ai/jev-intent.ts";

function corsHeaders(origin: string | null): Record<string, string> {
  const headers = getCorsHeaders(origin);
  if (headers["Access-Control-Allow-Origin"] || !origin) return headers;
  if (/^https:\/\/ten10-[a-z0-9-]+\.vercel\.app$/.test(origin)) {
    return {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      "Access-Control-Allow-Credentials": "true",
    };
  }
  return headers;
}

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { intent: null }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(origin, { error: "Missing authorization" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await userClient.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (userError || !userData.user) return json(origin, { error: "Invalid token" }, 401);

  const body = await req.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return json(origin, { intent: "out_of_scope" }, 200);

  const apiKey = (Deno.env.get("JEV_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { intent: null }, 200);

  try {
    const response = await fetch(JEV_SYSTEMONE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildIntentBody(text)),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`jev intent failed: ${response.status}`);
      return json(origin, { intent: null }, 200);
    }
    return json(origin, { intent: readIntentChoice(await response.json()) }, 200);
  } catch {
    console.error("jev intent failed");
    return json(origin, { intent: null }, 200);
  }
});
