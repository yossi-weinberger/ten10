export const ONBOARDING_BLOCKING_MODAL_EVENT = "ten10:onboarding-blocking-modal";

export function notifyOnboardingBlockingModal(isOpen: boolean): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent(ONBOARDING_BLOCKING_MODAL_EVENT, { detail: { isOpen } }),
  );
}

export function subscribeOnboardingBlockingModal(
  handler: (isOpen: boolean) => void,
): () => void {
  if (typeof window === "undefined") return () => undefined;

  const listener = (event: Event) => {
    const isOpen = (event as CustomEvent<{ isOpen?: boolean }>).detail?.isOpen;
    if (typeof isOpen === "boolean") {
      handler(isOpen);
    }
  };

  window.addEventListener(ONBOARDING_BLOCKING_MODAL_EVENT, listener);
  return () => {
    window.removeEventListener(ONBOARDING_BLOCKING_MODAL_EVENT, listener);
  };
}
