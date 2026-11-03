import {
  questionMonths,
  type QuestionCalendar,
  type YearTypeSum,
} from "../../../supabase/functions/_shared/ai/data-question.ts";
import type { ResolvedQuestion } from "../../../supabase/functions/_shared/ai/split-response.ts";
import { isIsoDate } from "../../../supabase/functions/_shared/ai/split-date.ts";

/** The reader's question, already checked against the user's lists. No word list. */
export function yearSumFromReader(
  question: ResolvedQuestion,
  today: string,
  calendar: QuestionCalendar,
): YearTypeSum | "ask_family" | null {
  if (!question.family) return "ask_family";
  if (!question.from || !question.to || !isIsoDate(question.from) || !isIsoDate(question.to)) return null;
  if (question.from > question.to) return null;
  const year = Number(question.from.slice(0, 4));
  const sameMonth = question.from.slice(0, 7) === question.to.slice(0, 7);
  return {
    year,
    month: sameMonth ? Number(question.from.slice(5, 7)) : null,
    type: question.family,
    measure: question.measure,
    months: questionMonths(question.from, question.to, today, calendar),
    paymentMethod: question.paymentMethod,
    topic: question.category,
    recipient: question.recipient,
    from: question.from,
    to: question.to,
  };
}
