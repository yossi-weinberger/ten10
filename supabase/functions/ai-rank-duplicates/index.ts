import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { AI_DRAFT_ALLOWED_TYPES } from "../_shared/transaction-domain/transaction-types.ts";
import {
  buildDuplicateRankBody,
  dayGap,
  JEV_SYSTEMONE_URL,
  readDuplicateRanks,
} from "../_shared/ai/jev-duplicate-rank.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";

const ALLOWED_TYPES = new Set<string>(AI_DRAFT_ALLOWED_TYPES);

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

interface RankInput {
  type: string;
  date: string;
  amount: number;
  currency: string;
  description: string;
}

function readInput(value: unknown): RankInput | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const amount = typeof record.amount === "number" ? record.amount : Number(record.amount);
  if (typeof record.type !== "string" || !ALLOWED_TYPES.has(record.type)) return null;
  if (typeof record.date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)) return null;
  if (!Number.isFinite(amount) || amount === 0) return null;
  if (typeof record.currency !== "string" || record.currency.trim().length === 0) return null;
  if (typeof record.description !== "string") return null;
  return {
    type: record.type,
    date: record.date,
    amount,
    currency: record.currency.trim().slice(0, 8),
    description: record.description.slice(0, 200),
  };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return json(origin, { ranked: false, scores: [] }, 405);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(origin, { error: "Missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (userError || !userData.user) return json(origin, { error: "Invalid token" }, 401);
  if (!isTrialUser(userData.user.id)) return json(origin, { ranked: false, scores: [] }, 200);

  const input = readInput(await req.json().catch(() => null));
  if (!input) return json(origin, { ranked: false, scores: [] }, 400);

  const { data, error } = await userClient.rpc("list_ai_duplicate_candidates", {
    p_type: input.type,
    p_date: input.date,
    p_amount: input.amount,
    p_currency: input.currency,
  });
  if (error || !Array.isArray(data) || data.length === 0) {
    return json(origin, { ranked: false, scores: [] }, 200);
  }

  const candidates = data.flatMap((row) => {
    if (!row || typeof row !== "object") return [];
    const record = row as { id?: unknown; date?: unknown; description?: unknown; amount?: unknown };
    const amount = typeof record.amount === "number" ? record.amount : Number(record.amount);
    if (typeof record.id !== "string" || typeof record.date !== "string") return [];
    if (!Number.isFinite(amount)) return [];
    const gap = dayGap(input.date, record.date);
    if (gap === null) return [];
    return [{
      id: record.id,
      description: typeof record.description === "string" ? record.description : "",
      type: input.type,
      dayGap: gap,
      amount,
      currency: input.currency,
    }];
  });
  if (candidates.length === 0 || input.description.trim().length === 0) {
    return json(origin, { ranked: false, scores: [] }, 200);
  }

  const apiKey = (Deno.env.get("JEV_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { ranked: false, scores: [] }, 200);

  const { body, idsByKey } = buildDuplicateRankBody({
    description: input.description,
    type: input.type,
    amount: input.amount,
    currency: input.currency,
    candidates,
  });

  try {
    const response = await fetch(JEV_SYSTEMONE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      console.error(`jev rank failed: ${response.status}`);
      return json(origin, { ranked: false, scores: [] }, 200);
    }
    const scores = readDuplicateRanks(await response.json(), idsByKey);
    return json(origin, { ranked: scores.length > 0, scores }, 200);
  } catch {
    console.error("jev rank failed");
    return json(origin, { ranked: false, scores: [] }, 200);
  }
});
