/** Jev Noul request for "same event". Amounts and user ids stay out of the body. */

export const JEV_DUPLICATE_MODEL = "jev-1.13.0";
export const JEV_SYSTEMONE_URL = "https://api.typesafe.ai/v1/systemone";
const MAX_CANDIDATES = 20;
const MAX_DESCRIPTION = 200;

export interface DuplicateRankCandidate {
  id: string;
  description: string;
  type: string;
  dayGap: number;
}

export interface DuplicateRankRequest {
  description: string;
  type: string;
  candidates: readonly DuplicateRankCandidate[];
}

interface NoulQuestion {
  type: "noul";
  instructions: {
    question: string;
    candidate: {
      description: string;
      type: string;
      day_difference: number;
    };
  };
  criteria: { true: string; false: string };
}

export interface DuplicateRankBody {
  model: string;
  state: { description: string; type: string };
  questions: Record<string, NoulQuestion>;
}

export function buildDuplicateRankBody(input: DuplicateRankRequest): {
  body: DuplicateRankBody;
  idsByKey: Record<string, string>;
} {
  const idsByKey: Record<string, string> = {};
  const questions: Record<string, NoulQuestion> = {};
  const candidates = input.candidates.slice(0, MAX_CANDIDATES);

  candidates.forEach((candidate, index) => {
    const key = `q${index}`;
    idsByKey[key] = candidate.id;
    questions[key] = {
      type: "noul",
      instructions: {
        question: "Is `candidate` the same real-world event as the state?",
        candidate: {
          description: candidate.description.slice(0, MAX_DESCRIPTION),
          type: candidate.type,
          day_difference: candidate.dayGap,
        },
      },
      criteria: {
        true: "Same purchase or payment, even when the wording differs",
        false: "A different event, including two similar payments on nearby days",
      },
    };
  });

  return {
    idsByKey,
    body: {
      model: JEV_DUPLICATE_MODEL,
      state: {
        description: input.description.slice(0, MAX_DESCRIPTION),
        type: input.type,
      },
      questions,
    },
  };
}

export function readDuplicateRanks(
  payload: unknown,
  idsByKey: Record<string, string>,
): { id: string; probability: number }[] {
  if (!payload || typeof payload !== "object") return [];
  const answers = (payload as { answers?: unknown }).answers;
  if (!answers || typeof answers !== "object") return [];

  return Object.entries(idsByKey).flatMap(([key, id]) => {
    const answer = (answers as Record<string, unknown>)[key];
    if (!answer || typeof answer !== "object") return [];
    const probability = (answer as { noul?: unknown }).noul;
    if (typeof probability !== "number" || !Number.isFinite(probability)) return [];
    if (probability < 0 || probability > 1) return [];
    return [{ id, probability }];
  });
}

export function dayGap(left: string, right: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(left) || !/^\d{4}-\d{2}-\d{2}$/.test(right)) return null;
  const leftMs = Date.parse(`${left}T00:00:00Z`);
  const rightMs = Date.parse(`${right}T00:00:00Z`);
  if (!Number.isFinite(leftMs) || !Number.isFinite(rightMs)) return null;
  return Math.round(Math.abs(leftMs - rightMs) / 86_400_000);
}
