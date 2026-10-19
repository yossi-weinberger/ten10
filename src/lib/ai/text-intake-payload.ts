export function textIntakePayload<T extends object>(
  payload: T,
  original: { description: string; amount: number },
  duplicate?: { choice: "saved_anyway" | "same_event"; candidateIds: string[] },
): T & {
  original_description: string;
  extracted_amount: number;
  duplicate_choice?: "saved_anyway" | "same_event";
  duplicate_candidate_ids?: string[];
} {
  return {
    ...payload,
    original_description: original.description,
    extracted_amount: original.amount,
    ...(duplicate
      ? {
          duplicate_choice: duplicate.choice,
          duplicate_candidate_ids: duplicate.candidateIds,
        }
      : {}),
  };
}
