import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import type { AnchoredSplitItem } from "../../../supabase/functions/_shared/ai/split-anchor.ts";

export type SplitItemsResult =
  | { ok: true; route: "list" }
  | { ok: true; route: "unreadable" }
  | { ok: true; route: "several"; items: AnchoredSplitItem[]; found: number; dropped: number }
  | { ok: false; reason: "UNAVAILABLE" };

export async function splitItems(text: string, today: string): Promise<SplitItemsResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "UNAVAILABLE" };
  const { data, error } = await supabase.functions.invoke("ai-split-items", {
    body: { text, today },
  });
  if (error || !data || typeof data !== "object") return { ok: false, reason: "UNAVAILABLE" };
  const body = data as { route?: unknown; reason?: unknown; items?: unknown; found?: unknown; dropped?: unknown };
  if (body.reason === "unavailable" || body.reason === "quota_exhausted" || body.reason === "rate_limited" || body.reason === "daily_limit") {
    return { ok: false, reason: "UNAVAILABLE" };
  }
  if (body.route === "list" || body.route === "unreadable") return { ok: true, route: body.route };
  if (body.route === "several" && Array.isArray(body.items)) {
    return {
      ok: true,
      route: "several",
      items: body.items as AnchoredSplitItem[],
      found: typeof body.found === "number" ? body.found : body.items.length,
      dropped: typeof body.dropped === "number" ? body.dropped : 0,
    };
  }
  return { ok: false, reason: "UNAVAILABLE" };
}
