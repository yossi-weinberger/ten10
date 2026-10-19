/** Jev Noul request for "same event". User ids stay out of the body. Amounts are included. */

export const JEV_DUPLICATE_MODEL = "typesafe-ai/jev";
export const JEV_SYSTEMONE_URL = "https://ai-gateway.vercel.sh/typesafe/v1/systemone";

/** Gateway key on the testing Edge secrets. No fallback models. */
export function gatewaySystemOneBody<T extends object>(body: T): T & {
  providerOptions: { gateway: { zeroDataRetention: true } };
} {
  return {
    ...body,
    providerOptions: {
      gateway: { zeroDataRetention: true },
    },
  };
}
const MAX_CANDIDATES = 20;
const MAX_DESCRIPTION = 200;

export interface DuplicateRankCandidate {
  id: string;
  description: string;
  type: string;
  dayGap: number;
  amount: number;
  currency: string;
}

export interface DuplicateRankRequest {
  description: string;
  type: string;
  amount: number;
  currency: string;
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
      amount: number;
      currency: string;
    };
  };
  criteria: { true: string; false: string };
}

export interface DuplicateRankBody {
  model: string;
  state: { description: string; type: string; amount: number; currency: string };
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
          amount: candidate.amount,
          currency: candidate.currency.trim().toUpperCase().slice(0, 8),
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
        amount: input.amount,
        currency: input.currency.trim().toUpperCase().slice(0, 8),
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
