/** Tags and a hashed user id for Vercel AI Gateway spend reports. */

export type GatewayFeature =
  | "intent"
  | "question_slots"
  | "receipt"
  | "speech"
  | "duplicates"
  | "shadow";

export type GatewaySource = "app" | "eval";

export type GatewayTagInput = {
  source: GatewaySource;
  feature: GatewayFeature;
  user?: string;
  only?: readonly string[];
};

export type GatewayProviderOptions = {
  zeroDataRetention: true;
  tags: string[];
  user?: string;
  only?: string[];
};

export function gatewayTags(source: GatewaySource, feature: GatewayFeature): string[] {
  return [`source:${source}`, feature];
}

export async function hashGatewayUserId(salt: string, userId: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(salt + userId),
  );
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function readGatewaySalt(): string {
  const runtime = globalThis as { Deno?: { env: { get(name: string): string | undefined } } };
  return (runtime.Deno?.env.get("AI_GATEWAY_USER_SALT") ?? "").trim();
}

/** Reads `AI_GATEWAY_USER_SALT`. Missing salt omits the user instead of sending the raw id. */
export async function hashGatewayUser(userId: string): Promise<string | undefined> {
  const salt = readGatewaySalt();
  if (!salt) return undefined;
  return hashGatewayUserId(salt, userId);
}

export function gatewayProviderOptions(input: GatewayTagInput): GatewayProviderOptions {
  return {
    zeroDataRetention: true,
    tags: gatewayTags(input.source, input.feature),
    ...(input.user ? { user: input.user } : {}),
    ...(input.only ? { only: [...input.only] } : {}),
  };
}
