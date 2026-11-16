/** Explicit production off-switch. Missing or any value other than "true" stays off. */
export function isAiIntakeEnabled(): boolean {
  try {
    return Deno.env.get("AI_INTAKE_ENABLED") === "true";
  } catch (error) {
    if (error instanceof Deno.errors.NotCapable) return false;
    throw error;
  }
}
