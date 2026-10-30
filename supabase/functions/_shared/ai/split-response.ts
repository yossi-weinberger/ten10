import { MAX_ITEMS_PER_MESSAGE } from "./multi-item.ts";
import { periodBounds } from "./split-period.ts";
import { anchorSplitItems, splitReadContext, type AnchoredSplitItem, type SplitReadContext } from "./split-anchor.ts";
import { splitPayloadSchema, type SplitQuestionInput, type SplitRuleInput } from "./split-schema.ts";

export interface ResolvedQuestion {
  measure: SplitQuestionInput["measure"];
  family: SplitQuestionInput["family"];
  recipient: string | null;
  category: string | null;
  paymentMethod: SplitQuestionInput["payment_method"];
  from: string | null;
  to: string | null;
}

export type SplitResponse =
  | { route: "list" }
  | { route: "unreadable" }
  | {
    route: "several";
    items: AnchoredSplitItem[];
    found: number;
    dropped: number;
    rule: SplitRuleInput | null;
    question: ResolvedQuestion | null;
  };

function asContext(todayOrContext: string | SplitReadContext): SplitReadContext | null {
  if (typeof todayOrContext === "string") {
    return /^\d{4}-\d{2}-\d{2}$/.test(todayOrContext) ? splitReadContext(todayOrContext) : null;
  }
  return /^\d{4}-\d{2}-\d{2}$/.test(todayOrContext.today) ? todayOrContext : null;
}

function jsonValue(payload: unknown): unknown {
  if (typeof payload !== "string") return payload;
  const trimmed = payload.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

/** The provider does not enforce the schema. Only a payload Zod accepts is used. */
export function parseSplitPayload(payload: unknown): ReturnType<typeof splitPayloadSchema.parse> | null {
  const parsed = splitPayloadSchema.safeParse(jsonValue(payload));
  return parsed.success ? parsed.data : null;
}

function questionInLists(question: SplitQuestionInput, context: SplitReadContext): ResolvedQuestion | null {
  const recipient = question.recipient && context.recipients.includes(question.recipient) ? question.recipient : null;
  const category = question.category && context.categories.includes(question.category) ? question.category : null;
  if (question.recipient && recipient === null) return null;
  if (question.category && category === null) return null;
  const bounds = periodBounds(question.period, context.today);
  if (!bounds) return null;
  return {
    measure: question.measure,
    family: question.family,
    recipient,
    category,
    paymentMethod: question.payment_method,
    from: bounds.from,
    to: bounds.to,
  };
}

/** Schema first, then amount evidence. A single unanchored amount stays and is asked. */
export function readSplitResponse(
  source: string,
  payload: unknown,
  todayOrContext: string | SplitReadContext,
): SplitResponse {
  const context = asContext(todayOrContext);
  if (!context) return { route: "unreadable" };
  const parsed = parseSplitPayload(payload);
  if (!parsed) return { route: "unreadable" };
  if (parsed.more_than_five || parsed.items.length > MAX_ITEMS_PER_MESSAGE) return { route: "list" };
  const anchored = anchorSplitItems(source, parsed.items, context);
  const question = parsed.question ? questionInLists(parsed.question, context) : null;
  const rule = parsed.rule && parsed.rule.match.trim().length >= 2
    ? { match: parsed.rule.match.trim(), action: parsed.rule.action }
    : null;
  if (anchored.items.length === 0 && !question && !rule) return { route: "unreadable" };
  return {
    route: "several",
    items: anchored.items,
    found: anchored.items.length,
    dropped: anchored.dropped,
    rule,
    question,
  };
}
