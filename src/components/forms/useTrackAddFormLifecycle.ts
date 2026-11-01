import { useEffect, useRef } from "react";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";

/**
 * Fires add-form open/abandon analytics. Abandon is deferred with
 * queueMicrotask so React StrictMode's effect → cleanup → effect cycle
 * does not count as a real unmount (the remounted effect sets mountedRef
 * back to true before the microtask runs).
 */
export function useTrackAddFormLifecycle(
  isEditMode: boolean,
  wasSaved: () => boolean,
): void {
  const formOpenedRef = useRef(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    if (!isEditMode && !formOpenedRef.current) {
      formOpenedRef.current = true;
      trackProductEvent("add_transaction_form_opened");
    }

    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      queueMicrotask(() => {
        if (mountedRef.current) return;
        if (!isEditMode && formOpenedRef.current && !wasSaved()) {
          trackProductEvent("add_transaction_form_abandoned");
        }
      });
    };
  }, [isEditMode, wasSaved]);
}
