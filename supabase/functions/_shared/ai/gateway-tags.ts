/**
 * Gateway provider options. App calls carry no tags and no user: each tagged request
 * costs a reporting surcharge, and `ai.model_calls` already keeps user, operation and cost.
 * Eval scripts tag `source:eval` so the spend report can subtract them.
 */

export type GatewayFeature =
  | "intent"
  | "question_slots"
  | "receipt"
  | "speech"
  | "duplicates"
  | "shadow"
  | "split";

export type GatewaySource = "app" | "eval";

export type GatewayTagInput = {
  source: GatewaySource;
  only?: readonly string[];
};

export type GatewayProviderOptions = {
  zeroDataRetention: true;
  tags?: string[];
  only?: string[];
};

export const EVAL_SOURCE_TAG = "source:eval";

export function gatewayProviderOptions(input: GatewayTagInput): GatewayProviderOptions {
  return {
    zeroDataRetention: true,
    ...(input.source === "eval" ? { tags: [EVAL_SOURCE_TAG] } : {}),
    ...(input.only ? { only: [...input.only] } : {}),
  };
}
