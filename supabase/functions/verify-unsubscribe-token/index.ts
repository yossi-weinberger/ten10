import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { verify } from "https://deno.land/x/djwt@v3.0.1/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface UnsubscribePayload {
  userId: string;
  email: string;
  type: "reminder" | "all";
  exp: number;
}

type UnsubscribeType = "reminder" | "all";

function resolveUnsubscribeType(
  payloadType: unknown,
  bodyType: unknown,
): UnsubscribeType {
  // Prefer the signed token type; body type is only a fallback for older clients.
  if (payloadType === "reminder" || payloadType === "all") {
    return payloadType;
  }
  if (bodyType === "reminder" || bodyType === "all") {
    return bodyType;
  }
  return "all";
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const token = body?.token;
    const bodyType = body?.type;

    if (!token || typeof token !== "string") {
      return new Response(JSON.stringify({ error: "Token is required" }), {
        status: 400,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    const jwtSecret = Deno.env.get("JWT_SECRET");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!jwtSecret) {
      throw new Error("JWT_SECRET environment variable is not set");
    }
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set");
    }

    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(jwtSecret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    const payload = (await verify(token, key)) as UnsubscribePayload;

    if (!payload?.userId) {
      return new Response(
        JSON.stringify({ error: "Invalid token payload" }),
        {
          status: 401,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    const unsubscribeType = resolveUnsubscribeType(payload.type, bodyType);

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { error: rpcError } = await supabaseAdmin.rpc(
      "update_user_preferences",
      {
        p_user_id: payload.userId,
        p_reminder_enabled: unsubscribeType === "reminder" ? false : null,
        p_mailing_list_consent: unsubscribeType === "all" ? false : null,
      },
    );

    if (rpcError) {
      console.error("[UNSUBSCRIBE] Failed to update preferences:", rpcError);
      return new Response(
        JSON.stringify({
          error: "Failed to update preferences",
          details: rpcError.message,
        }),
        {
          status: 500,
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        type: unsubscribeType,
      }),
      {
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Token verification / unsubscribe error:", error);
    return new Response(
      JSON.stringify({
        error: "Invalid or expired token",
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 401,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      },
    );
  }
});
