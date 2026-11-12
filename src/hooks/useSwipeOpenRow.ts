import { useCallback, useEffect, useState } from "react";

/**
 * Tracks a single open swipe row. Closes it on an outside tap or any scroll,
 * and clears it while `reset` is true (selection mode).
 */
export function useSwipeOpenRow(reset: boolean): {
  openId: string | null;
  open: (id: string) => void;
  close: () => void;
} {
  const [swipeOpenId, setSwipeOpenId] = useState<string | null>(null);

  if (reset && swipeOpenId !== null) {
    setSwipeOpenId(null);
  }
  const openId = reset ? null : swipeOpenId;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!openId) return;
      const target = event.target;
      if (target instanceof Element) {
        const row = target.closest("[data-swipe-row]");
        if (row?.getAttribute("data-swipe-row") === openId) return;
      }
      setSwipeOpenId(null);
    };

    const handleScroll = () => {
      if (openId) {
        setSwipeOpenId(null);
      }
    };

    if (openId) {
      document.addEventListener("click", handleClickOutside, true);
      window.addEventListener("scroll", handleScroll, true);
    }

    return () => {
      document.removeEventListener("click", handleClickOutside, true);
      window.removeEventListener("scroll", handleScroll, true);
    };
  }, [openId]);

  const open = useCallback((id: string) => {
    setSwipeOpenId(id);
  }, []);

  const close = useCallback(() => {
    setSwipeOpenId(null);
  }, []);

  return { openId, open, close };
}
