/** Trial users on the testing clone. Anyone else is denied before a provider call. */
export const TRIAL_USER_IDS = [
  "01665dce-d261-4a9b-b89d-04ce2460859b",
  "45e3efc0-171b-48ce-9f15-4468394dfaeb",
  "a0a4fdd4-49bf-48a0-a3b0-4c76d60597e4",
  "5403d7d1-3f44-4243-a84a-f905c4aad30c",
  "f336e5d1-4dc2-40c6-b176-c0b199ee836d",
  "a3f81dec-f634-4784-9cc0-9921838a6037",
  "c4e7d297-9ed3-421a-af9c-92ccccf95ba0",
] as const;

const ALLOWED = new Set<string>(TRIAL_USER_IDS);

function safeEnv(name: string): string | undefined {
  try {
    return Deno.env.get(name);
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return undefined;
    throw error;
  }
}

export function isTrialUser(userId: string | undefined): boolean {
  if (!userId) return false;
  // If AI_TRIAL_ONLY is explicitly "false", all authenticated users are allowed (production launch)
  if (safeEnv("AI_TRIAL_ONLY") === "false") {
    return true;
  }
  // In production environment, all authenticated users are allowed unless AI_TRIAL_ONLY is explicitly "true"
  const env = (safeEnv("ENVIRONMENT") ?? safeEnv("DENO_ENV") ?? "").toLowerCase();
  if (env === "production" && safeEnv("AI_TRIAL_ONLY") !== "true") {
    return true;
  }
  return ALLOWED.has(userId);
}
