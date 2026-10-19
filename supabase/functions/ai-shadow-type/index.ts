import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { JEV_SYSTEMONE_URL } from "../_shared/ai/jev-duplicate-rank.ts";
import { buildTypeChoiceBody, readTypeChoice } from "../_shared/ai/jev-type-choice.ts";

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
  if (req.method !== "POST") return json(origin, { recorded: false }, 405);

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

  const body = await req.json().catch(() => null) as { item_id?: unknown } | null;
  const itemId = typeof body?.item_id === "string" ? body.item_id : "";
  if (!itemId) return json(origin, { recorded: false }, 400);

  const { data: context, error: contextError } = await userClient.rpc("read_ai_shadow_type_context", {
    p_item_id: itemId,
  });
  if (contextError || !context || typeof context !== "object") {
    return json(origin, { recorded: false }, 200);
  }
  const record = context as { description?: unknown; amount?: unknown; currency?: unknown; date?: unknown };
  const amount = typeof record.amount === "number" ? record.amount : Number(record.amount);
  if (
    typeof record.description !== "string"
    || typeof record.currency !== "string"
    || typeof record.date !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)
    || !Number.isFinite(amount)
    || amount === 0
  ) {
    return json(origin, { recorded: false }, 200);
  }

  const apiKey = (Deno.env.get("JEV_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { recorded: false }, 200);

  try {
    const response = await fetch(JEV_SYSTEMONE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildTypeChoiceBody({
        description: record.description,
        amount,
        currency: record.currency,
        date: record.date,
      })),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`jev type shadow failed: ${response.status}`);
      return json(origin, { recorded: false }, 200);
    }
    const choice = readTypeChoice(await response.json());
    if (!choice) return json(origin, { recorded: false }, 200);
    const { error: recordError } = await userClient.rpc("record_ai_shadow_type", {
      p_item_id: itemId,
      p_choice: choice.choice,
      p_confidence: choice.confidence,
    });
    if (recordError) return json(origin, { recorded: false }, 200);
    return json(origin, { recorded: true }, 200);
  } catch {
    console.error("jev type shadow failed");
    return json(origin, { recorded: false }, 200);
  }
});
