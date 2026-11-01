import { supabase } from "@/lib/supabaseClient";
import { aiCallsAllowed } from "@/lib/ai/flags";
import type { AnchoredSplitItem } from "../../../supabase/functions/_shared/ai/split-anchor.ts";
import type { ResolvedQuestion } from "../../../supabase/functions/_shared/ai/split-response.ts";
import type { SplitRuleInput } from "../../../supabase/functions/_shared/ai/split-schema.ts";

export type SplitItemsResult =
  | { ok: true; route: "list"; usageId: string | null }
  | { ok: true; route: "unreadable"; usageId: string | null }
  | {
    ok: true;
    route: "several";
    items: AnchoredSplitItem[];
    found: number;
    dropped: number;
    rule: SplitRuleInput | null;
    question: ResolvedQuestion | null;
    usageId: string | null;
  }
  | { ok: false; reason: "UNAVAILABLE" };

export interface SplitCallOptions {
  timeZone?: string;
  receivedAt?: string;
  defaultCurrency?: string;
}

function usageIdOf(body: { usage_id?: unknown }): string | null {
  return typeof body.usage_id === "string" ? body.usage_id : null;
}

export async function splitItems(
  text: string,
  today: string,
  options: SplitCallOptions = {},
): Promise<SplitItemsResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "UNAVAILABLE" };
  const { data, error } = await supabase.functions.invoke("ai-split-items", {
    body: {
      text,
      today,
      timeZone: options.timeZone,
      receivedAt: options.receivedAt,
      defaultCurrency: options.defaultCurrency,
    },
  });
  if (error || !data || typeof data !== "object") return { ok: false, reason: "UNAVAILABLE" };
  const body = data as {
    route?: unknown;
    reason?: unknown;
    items?: unknown;
    found?: unknown;
    dropped?: unknown;
    rule?: unknown;
    question?: unknown;
    usage_id?: unknown;
  };
  if (body.reason === "unavailable" || body.reason === "quota_exhausted" || body.reason === "rate_limited" || body.reason === "daily_limit") {
    return { ok: false, reason: "UNAVAILABLE" };
  }
  const usageId = usageIdOf(body);
  if (body.route === "list" || body.route === "unreadable") return { ok: true, route: body.route, usageId };
  if (body.route === "several" && Array.isArray(body.items)) {
    const rule = body.rule && typeof body.rule === "object" ? body.rule as SplitRuleInput : null;
    const question = body.question && typeof body.question === "object" ? body.question as ResolvedQuestion : null;
    return {
      ok: true,
      route: "several",
      items: body.items as AnchoredSplitItem[],
      found: typeof body.found === "number" ? body.found : body.items.length,
      dropped: typeof body.dropped === "number" ? body.dropped : 0,
      rule,
      question,
      usageId,
    };
  }
  return { ok: false, reason: "UNAVAILABLE" };
}

/** Gives the call unit back when Jev does not use the reader. */
export async function releaseSplit(usageId: string): Promise<void> {
  if (!aiCallsAllowed()) return;
  await supabase.functions.invoke("ai-split-items", { body: { release: usageId } });
}
