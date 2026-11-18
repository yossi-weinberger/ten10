export const ASSISTANT_INTRO_VERSION = "v2";
export const INTRO_DELAY_MS = 800;
export const RIPPLE_MS = 800;
export const RIPPLE_REPEATS = 5;
export const COACH_LINGER_MS = 8_000;
export const INTRO_SESSION_LIMIT = 3;
export const DIALOG_RETRY_MS = 400;

export type IntroPreview = "off" | "replay" | "motion" | "reset";

export function assistantIntroStorageKey(userId: string): string {
  return `ten10.assistantIntroSeen.${ASSISTANT_INTRO_VERSION}.${userId}`;
}

export function assistantCoachStorageKey(userId: string): string {
  return `ten10.assistantIntroCoach.v1.${userId}`;
}

export function assistantIntroDismissedKey(userId: string): string {
  return `ten10.assistantIntroDismissed.v1.${userId}`;
}

export function assistantIntroSessionCountKey(userId: string): string {
  return `ten10.assistantIntroSessions.v1.${userId}`;
}

export function assistantIntroSessionKey(userId: string): string {
  return `ten10.assistantIntroSession.v1.${userId}`;
}

/** Developer preview is ignored outside a dev build, so production reduced-motion stays in force. */
export function readIntroPreview(search: string, dev: boolean): IntroPreview {
  if (!dev) return "off";
  const value = new URLSearchParams(search).get("aiIntro");
  if (value === "replay" || value === "motion" || value === "reset") return value;
  return "off";
}

export function hasSeenAssistantIntro(storage: Storage, userId: string): boolean {
  try {
    return storage.getItem(assistantIntroStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markAssistantIntroSeen(storage: Storage, userId: string): void {
  try {
    storage.setItem(assistantIntroStorageKey(userId), "1");
  } catch {
    // Private mode still opens the assistant.
  }
}

export function hasSeenAssistantCoach(storage: Storage, userId: string): boolean {
  try {
    return storage.getItem(assistantCoachStorageKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function markAssistantCoachShown(storage: Storage, userId: string): void {
  try {
    storage.setItem(assistantCoachStorageKey(userId), "1");
  } catch {
    // The note can show again next visit.
  }
}

export function hasDismissedAssistantIntro(storage: Storage, userId: string): boolean {
  try {
    return storage.getItem(assistantIntroDismissedKey(userId)) === "1";
  } catch {
    return false;
  }
}

export function dismissAssistantIntro(storage: Storage, userId: string): void {
  try {
    storage.setItem(assistantIntroDismissedKey(userId), "1");
  } catch {
    // Closing the note still hides it for this visit.
  }
}

function introSessionCount(storage: Storage, userId: string): number {
  try {
    const count = Number(storage.getItem(assistantIntroSessionCountKey(userId)));
    return Number.isInteger(count) && count > 0 ? count : 0;
  } catch {
    return 0;
  }
}

/** Starts the ripple for this browser session. Three sessions, acceptance, or an X dismiss stop it. */
export function beginAssistantIntroSession(local: Storage, session: Storage, userId: string): boolean {
  if (hasSeenAssistantIntro(local, userId) || hasDismissedAssistantIntro(local, userId)) return false;
  try {
    if (session.getItem(assistantIntroSessionKey(userId)) === "1") return false;
    const count = introSessionCount(local, userId);
    if (count >= INTRO_SESSION_LIMIT) return false;
    local.setItem(assistantIntroSessionCountKey(userId), String(count + 1));
    session.setItem(assistantIntroSessionKey(userId), "1");
  } catch {
    return true;
  }
  return true;
}

export function clearAssistantIntroSeen(storage: Storage, userId: string, session?: Storage): void {
  try {
    storage.removeItem(assistantIntroStorageKey(userId));
    storage.removeItem(assistantCoachStorageKey(userId));
    storage.removeItem(assistantIntroDismissedKey(userId));
    storage.removeItem(assistantIntroSessionCountKey(userId));
    session?.removeItem(assistantIntroSessionKey(userId));
  } catch {
    // Nothing to reset.
  }
}

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Radix dialogs set data-state="open". The intro waits instead of covering them. */
export function isBlockingDialogOpen(): boolean {
  return document.querySelector('[role="dialog"][data-state="open"]') !== null;
}
