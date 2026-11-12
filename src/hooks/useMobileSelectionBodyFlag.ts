import { useEffect } from "react";

/** Marks the document while a mobile multi-select session is active. */
export function useMobileSelectionBodyFlag(active: boolean): void {
  useEffect(() => {
    if (active) {
      document.body.dataset.mobileSelectionActive = "true";
    } else {
      delete document.body.dataset.mobileSelectionActive;
    }
    return () => {
      delete document.body.dataset.mobileSelectionActive;
    };
  }, [active]);
}
