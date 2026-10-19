export function textIntakePayload(
  payload: Record<string, unknown>,
  original: { description: string; amount: number },
  duplicate?: { choice: "saved_anyway" | "same_event"; candidateIds: string[] },
): Record<string, unknown> {
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
