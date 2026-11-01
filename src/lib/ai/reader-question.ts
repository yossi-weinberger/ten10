import type { YearTypeSum } from "../../../supabase/functions/_shared/ai/data-question.ts";
import type { ResolvedQuestion } from "../../../supabase/functions/_shared/ai/split-response.ts";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

function monthSpan(from: string, to: string): number {
  const startYear = Number(from.slice(0, 4));
  const startMonth = Number(from.slice(5, 7));
  const endYear = Number(to.slice(0, 4));
  const endMonth = Number(to.slice(5, 7));
  const span = (endYear - startYear) * 12 + (endMonth - startMonth) + 1;
  return span < 1 ? 1 : span;
}

/** The reader's question, already checked against the user's lists. No word list. */
export function yearSumFromReader(question: ResolvedQuestion): YearTypeSum | "ask_family" | null {
  if (!question.family) return "ask_family";
  if (!question.from || !question.to || !ISO.test(question.from) || !ISO.test(question.to)) return null;
  if (question.from > question.to) return null;
  const year = Number(question.from.slice(0, 4));
  const sameMonth = question.from.slice(0, 7) === question.to.slice(0, 7);
  return {
    year,
    month: sameMonth ? Number(question.from.slice(5, 7)) : null,
    type: question.family,
    measure: question.measure,
    months: monthSpan(question.from, question.to),
    paymentMethod: question.paymentMethod,
    topic: question.category,
    recipient: question.recipient,
    from: question.from,
    to: question.to,
  };
}
