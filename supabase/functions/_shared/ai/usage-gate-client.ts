import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { logger } from "../logger.ts";
import { readUsageDecision, type UsageDecision, type UsageKind } from "./usage-gate.ts";

export interface UsageGate {
  /** Weighted use: one text message, receipt, or voice message. */
  consume(userId: string, kind: UsageKind): Promise<UsageDecision>;
  /** A follow-up model call with no weight, counted only against the minute and day caps. */
  consumeCall(userId: string): Promise<UsageDecision>;
  /** Gives the units back after the provider failed. */
  release(usageId: string | null): Promise<void>;
}

export function serviceUsageGate(): UsageGate {
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const unavailable = readUsageDecision(null, "service role is not configured");
  if (!serviceKey || !supabaseUrl) {
    return {
      consume: () => Promise.resolve(unavailable),
      consumeCall: () => Promise.resolve(unavailable),
      release: () => Promise.resolve(),
    };
  }
  const admin = createClient(supabaseUrl, serviceKey);
  return {
    async consume(userId, kind) {
      const { data, error } = await admin.rpc("consume_ai_usage", { p_user_id: userId, p_kind: kind });
      if (error) logger.error("usage check failed");
      return readUsageDecision(data, error);
    },
    async consumeCall(userId) {
      const { data, error } = await admin.rpc("consume_ai_call", { p_user_id: userId });
      if (error) logger.error("call check failed");
      return readUsageDecision(data, error);
    },
    async release(usageId) {
      if (!usageId) return;
      const { error } = await admin.rpc("release_ai_usage", { p_usage_id: usageId });
      if (error) logger.error("usage release failed");
    },
  };
}
