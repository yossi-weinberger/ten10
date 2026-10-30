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

function blank(value: unknown): unknown {
  return value === "" || value === 0 ? null : value;
}

function dateFields(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const date = { ...(value as Record<string, unknown>) };
  for (const key of ["n", "weekday", "day", "month", "year"]) date[key] = blank(date[key]);
  return date;
}

/** The enforced schema uses 0 and "" where the reader uses null. A non-array items field is left invalid. */
function normalizeSplit(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const body = { ...(value as Record<string, unknown>) };
  if (Array.isArray(body.items)) {
    body.items = body.items.map((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return item;
      const row = { ...(item as Record<string, unknown>) };
      if ("date_kind" in row) {
        const kind = blank(row.date_kind);
        row.date = kind === null ? null : {
          kind,
          n: null,
          weekday: null,
          day: blank(row.date_day),
          month: blank(row.date_month),
          year: blank(row.date_year),
        };
        row.amount_text = blank(row.amount_text);
        row.currency = blank(row.currency);
        row.type = blank(row.type);
        row.type_question = blank(row.type_question);
        row.payment_method = blank(row.payment_method);
        row.date_text = blank(row.date_text);
        row.category = null;
        row.rule_id = null;
        row.requested_rate = null;
        const frequency = blank(row.recurrence_frequency);
        row.recurrence = frequency === null ? null : {
          frequency,
          calendar: "gregorian",
          day_of_month: null,
          weekday: null,
          start_kind: null,
          start: null,
          end_kind: null,
          end_count: null,
          end: null,
          already_charged: false,
        };
      }
      row.requested_rate = blank(row.requested_rate);
      row.category = blank(row.category);
      row.rule_id = blank(row.rule_id);
      row.date = row.date === null ? null : dateFields(row.date);
      if (row.recurrence && typeof row.recurrence === "object" && !Array.isArray(row.recurrence)) {
        const recurrence = { ...(row.recurrence as Record<string, unknown>) };
        recurrence.day_of_month = blank(recurrence.day_of_month);
        recurrence.weekday = blank(recurrence.weekday);
        recurrence.start_kind = blank(recurrence.start_kind);
        recurrence.end_kind = blank(recurrence.end_kind);
        recurrence.end_count = blank(recurrence.end_count);
        recurrence.start = dateFields(recurrence.start);
        recurrence.end = dateFields(recurrence.end);
        row.recurrence = recurrence;
      }
      return row;
    });
  }
  if (typeof body.rule_match === "string") {
    const match = body.rule_match.trim();
    body.rule = match.length === 0 ? null : { match, action: blank(body.rule_action) };
    body.question = body.question ?? null;
  }
  if (body.rule && typeof body.rule === "object" && !Array.isArray(body.rule)) {
    const rule = { ...(body.rule as Record<string, unknown>) };
    rule.action = blank(rule.action);
    body.rule = rule;
  }
  if (body.question && typeof body.question === "object" && !Array.isArray(body.question)) {
    const question = { ...(body.question as Record<string, unknown>) };
    for (const key of ["family", "recipient", "category", "payment_method"]) question[key] = blank(question[key]);
    if (question.period && typeof question.period === "object" && !Array.isArray(question.period)) {
      const period = { ...(question.period as Record<string, unknown>) };
      for (const key of ["year", "month", "n"]) period[key] = blank(period[key]);
      period.from = dateFields(period.from);
      period.to = dateFields(period.to);
      question.period = period;
    }
    body.question = question;
  }
  return body;
}

export function parseSplitPayload(payload: unknown): ReturnType<typeof splitPayloadSchema.parse> | null {
  const value = normalizeSplit(jsonValue(payload));
  const parsed = splitPayloadSchema.safeParse(value);
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
