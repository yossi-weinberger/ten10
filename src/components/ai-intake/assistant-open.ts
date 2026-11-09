/** The floating button lives in App and the drawer in the Sidebar. A window event joins them without a store. */
const OPEN_EVENT = "ten10:open-assistant";

export function requestAssistantOpen(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function onAssistantOpenRequest(open: () => void): () => void {
  window.addEventListener(OPEN_EVENT, open);
  return () => window.removeEventListener(OPEN_EVENT, open);
}
