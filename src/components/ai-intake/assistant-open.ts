/** The floating button lives in App and the drawer in the Sidebar. A window event joins them without a store. */
const OPEN_EVENT = "ten10:open-assistant";

export function requestAssistantOpen(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onAssistantOpenRequest(open: () => void): () => void {
  window.addEventListener(OPEN_EVENT, open);
  return () => window.removeEventListener(OPEN_EVENT, open);
}

/** The consent sheet covers the floating button. Listeners hide it until the sheet closes. */
let consentCovered = false;
const consentCoverListeners = new Set<() => void>();

export function setAssistantConsentCover(covered: boolean): void {
  if (consentCovered === covered) return;
  consentCovered = covered;
  for (const listener of consentCoverListeners) listener();
}

export function subscribeAssistantConsentCover(listener: () => void): () => void {
  consentCoverListeners.add(listener);
  return () => {
    consentCoverListeners.delete(listener);
  };
}

export function getAssistantConsentCover(): boolean {
  return consentCovered;
}
