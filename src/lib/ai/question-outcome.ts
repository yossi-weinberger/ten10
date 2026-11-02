import { supabase } from "@/lib/supabaseClient";

export const QUESTION_OUTCOME_WINDOW_MS = 60_000;

export const QUESTION_OUTCOMES = [
  "asked_family",
  "searched_description",
  "asked_again",
  "answered",
] as const;

export type QuestionOutcome = (typeof QUESTION_OUTCOMES)[number];

export type MeasurementHold = {
  id: string;
  at: number;
};

export type QuestionOutcomeEvent = "family" | "search" | "ask" | "timeout";

/** The first follow-up within 60 seconds wins. A numeric answer waits out the window. */
export function nextQuestionOutcome(input: {
  hold: MeasurementHold | null;
  now: number;
  event: QuestionOutcomeEvent;
}): { mark: { id: string; outcome: QuestionOutcome } | null; hold: MeasurementHold | null } {
  const { hold, now, event } = input;
  if (!hold) return { mark: null, hold: null };
  if (event === "family") return { mark: { id: hold.id, outcome: "asked_family" }, hold: null };
  if (event === "search") return { mark: { id: hold.id, outcome: "searched_description" }, hold: null };
  if (event === "ask") {
    if (now - hold.at > QUESTION_OUTCOME_WINDOW_MS) return { mark: null, hold: null };
    return { mark: { id: hold.id, outcome: "asked_again" }, hold: null };
  }
  return { mark: { id: hold.id, outcome: "answered" }, hold: null };
}

export async function markQuestionOutcome(id: string, outcome: QuestionOutcome): Promise<void> {
  await supabase.rpc("mark_ai_question_outcome", {
    p_measurement_id: id,
    p_outcome: outcome,
  });
}
