export const ASSISTANT_INTRO_VERSION = "v1";
export const INTRO_DELAY_MS = 800;
export const RIPPLE_MS = 800;
export const COACH_LINGER_MS = 12_000;
export const DIALOG_RETRY_MS = 400;

export type IntroPreview = "off" | "replay" | "motion" | "reset";

export function assistantIntroStorageKey(userId: string): string {
  return `ten10.assistantIntroSeen.${ASSISTANT_INTRO_VERSION}.${userId}`;
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

export function clearAssistantIntroSeen(storage: Storage, userId: string): void {
  try {
    storage.removeItem(assistantIntroStorageKey(userId));
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
