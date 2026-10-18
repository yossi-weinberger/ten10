import type {
  DecisionAdapter,
  DecisionInput,
  DecisionResult,
} from "./decision.ts";

/**
 * Closed labels for an extracted tithe type that is not itself a Ten10 type.
 * Matched only against fields.type. Source text is never consulted.
 */
const AMBIGUOUS_TITHE_LABELS = new Set([
  "tithe",
  "maaser",
  "מעשר",
  "מעשרות",
]);

const AMBIGUOUS_TITHE_CHOICE = "donation";

function isChoice<TChoice extends string>(
  value: string,
  choices: readonly TChoice[],
): value is TChoice {
  return choices.some((choice) => choice === value);
}

function resolveChoice<TChoice extends string>(
  extractedType: string,
  choices: readonly TChoice[],
): TChoice {
  if (isChoice(extractedType, choices)) {
    return extractedType;
  }

  const label = extractedType.trim().toLowerCase();
  if (
    AMBIGUOUS_TITHE_LABELS.has(extractedType.trim()) ||
    AMBIGUOUS_TITHE_LABELS.has(label)
  ) {
    if (isChoice(AMBIGUOUS_TITHE_CHOICE, choices)) {
      return AMBIGUOUS_TITHE_CHOICE;
    }
  }

  throw new Error(
    "RulesDecisionAdapter: extracted type is not in the allowed set",
  );
}

/** Picks one allowed choice from already-extracted fields. No network. */
export class RulesDecisionAdapter implements DecisionAdapter {
  async decide<TChoice extends string>(
    input: DecisionInput<TChoice>,
  ): Promise<DecisionResult<TChoice>> {
    if (input.choices.length === 0) {
      throw new Error("RulesDecisionAdapter requires a closed choice list");
    }

    return { choice: resolveChoice(input.fields.type, input.choices) };
  }
}
