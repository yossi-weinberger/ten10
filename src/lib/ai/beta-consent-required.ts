/** Stable error code returned by the AI edge gate when beta terms are missing or stale. */
export const BETA_CONSENT_REQUIRED_CODE = "beta_consent_required";

type ConsentListener = () => void;

const listeners = new Set<ConsentListener>();

export function isBetaConsentRequiredBody(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  return (body as { code?: unknown }).code === BETA_CONSENT_REQUIRED_CODE;
}

/**
 * supabase-js puts a non-2xx edge response on FunctionsHttpError.context.
 * The body is unread, so a Response can be parsed here. A plain object is
 * accepted for tests and for any caller that already parsed it.
 */
export async function readBetaConsentRequired(error: unknown, data: unknown): Promise<boolean> {
  if (isBetaConsentRequiredBody(data)) return true;
  if (!error || typeof error !== "object" || !("context" in error)) return false;
  const context = (error as { context?: unknown }).context;
  if (typeof Response !== "undefined" && context instanceof Response) {
    try {
      return isBetaConsentRequiredBody(await context.clone().json());
    } catch {
      return false;
    }
  }
  return isBetaConsentRequiredBody(context);
}

/** The assistant drawer subscribes and reopens BetaTermsDialog. */
export function onBetaConsentRequired(listener: ConsentListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function emitBetaConsentRequired(): void {
  for (const listener of listeners) listener();
}

/** True when this invoke was rejected for beta consent. Notifies the dialog. */
export async function claimBetaConsentRequired(error: unknown, data: unknown): Promise<boolean> {
  const required = await readBetaConsentRequired(error, data);
  if (required) emitBetaConsentRequired();
  return required;
}
