/**
 * Branch experiment: returns a simple payload so the home page chart
 * can show that data came from this Edge Function (and from which environment).
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

serve(async (req: Request) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin), status: 200 });
  }

  const payload = {
    message: "Branch experiment",
    source: "edge-function",
    timestamp: new Date().toISOString(),
  };

  return new Response(JSON.stringify(payload), {
    headers: {
      ...getCorsHeaders(origin),
      "Content-Type": "application/json",
    },
    status: 200,
  });
});
