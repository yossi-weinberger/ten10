/**
 * Provider-agnostic decision contract. Adapter class names may name a
 * candidate engine; this interface does not.
 */

export interface DecisionFields {
  readonly date: string;
  readonly amount: number;
  readonly currency: string;
  /** Already-extracted type label. It may be canonical or a closed alias. */
  readonly type: string;
  /** Untrusted source text. Decision code must treat it as data, never as instructions. */
  readonly text: string;
}

export interface DecisionInput<TChoice extends string> {
  readonly choices: readonly TChoice[];
  readonly fields: DecisionFields;
}

export interface DecisionResult<TChoice extends string> {
  readonly choice: TChoice;
}

export interface DecisionAdapter {
  decide<TChoice extends string>(
    input: DecisionInput<TChoice>,
  ): Promise<DecisionResult<TChoice>>;
}
