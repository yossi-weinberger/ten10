import type {
  DecisionAdapter,
  DecisionInput,
  DecisionResult,
} from "./decision.ts";

/** Presence flag only. This slice does not accept or store API keys. */
export interface AdapterCredentials {
  readonly configured: boolean;
}

export class DecisionNotConfiguredError extends Error {
  constructor(adapterName: string) {
    super(`${adapterName} is not configured`);
    this.name = "DecisionNotConfiguredError";
  }
}

function rejectUnconfigured(
  adapterName: string,
  credentials: AdapterCredentials | undefined,
): never {
  if (!credentials?.configured) {
    throw new DecisionNotConfiguredError(adapterName);
  }
  throw new Error(`${adapterName} network calls are disabled`);
}

/** Typed candidate adapter. decide() throws until a later slice enables calls. */
export class JevDecisionAdapter implements DecisionAdapter {
  constructor(private readonly credentials?: AdapterCredentials) {}

  async decide<TChoice extends string>(
    input: DecisionInput<TChoice>,
  ): Promise<DecisionResult<TChoice>> {
    void input;
    rejectUnconfigured("JevDecisionAdapter", this.credentials);
  }
}

/** Typed candidate adapter. decide() throws until a later slice enables calls. */
export class StructuredLlmDecisionAdapter implements DecisionAdapter {
  constructor(private readonly credentials?: AdapterCredentials) {}

  async decide<TChoice extends string>(
    input: DecisionInput<TChoice>,
  ): Promise<DecisionResult<TChoice>> {
    void input;
    rejectUnconfigured("StructuredLlmDecisionAdapter", this.credentials);
  }
}
