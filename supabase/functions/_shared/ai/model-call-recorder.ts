import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import type { ModelCallRow } from "./model-call.ts";

/** Writes `ai.model_calls` through `record_ai_model_call` with the service role. */
export function serviceModelCallRecorder(): (row: ModelCallRow) => Promise<void> {
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!serviceKey || !supabaseUrl) {
    return () => Promise.reject(new Error("service role is not configured"));
  }
  const admin = createClient(supabaseUrl, serviceKey);
  return async (row) => {
    const { error } = await admin.rpc("record_ai_model_call", {
      p_user_id: row.userId,
      p_operation: row.operation,
      p_model: row.model,
      p_ok: row.ok,
      p_http_status: row.httpStatus,
      p_error_code: row.errorCode,
      p_latency_ms: row.latencyMs,
      p_input_tokens: row.inputTokens,
      p_output_tokens: row.outputTokens,
      p_cost_usd: row.costUsd,
      p_generation_id: row.generationId,
    });
    if (error) throw new Error("record_ai_model_call failed");
  };
}
