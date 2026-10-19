/**
 * Edge logger. The only place Edge code may call console.
 * Do not pass receipt text, message text, prompts, or secrets.
 * log and warn stay quiet unless ENVIRONMENT or DENO_ENV is development or local.
 * error always prints, and should be a status or name only.
 */

function isDevelopment(): boolean {
  const env = Deno.env.get("ENVIRONMENT") ?? Deno.env.get("DENO_ENV") ?? "";
  return env === "development" || env === "local";
}

export const logger = {
  log(...args: unknown[]): void {
    if (isDevelopment()) console.log(...args);
  },
  warn(...args: unknown[]): void {
    if (isDevelopment()) console.warn(...args);
  },
  error(...args: unknown[]): void {
    console.error(...args);
  },
};
