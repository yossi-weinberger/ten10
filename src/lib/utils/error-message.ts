/**
 * Extracts a human-readable message from a caught `unknown` error.
 * Handles both real Error instances and Supabase-style plain error objects
 * (e.g. PostgrestError), which have a `.message` field but don't extend
 * Error — `err instanceof Error` alone would silently swallow those.
 */
export function getErrorMessage(err: unknown): string | undefined {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string") return message;
  }
  return undefined;
}
