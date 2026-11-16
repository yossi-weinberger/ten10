import { useEffect, useRef, useState } from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_CARD_QUERY } from "@/lib/responsive";

function scrollPageToTop(): void {
  window.scrollTo(0, 0);
  const scroller = document.querySelector("main")?.parentElement;
  if (scroller instanceof HTMLElement) {
    scroller.scrollTop = 0;
  }
}

/**
 * Reactive card layout for the transaction lists.
 * While `deferSwitch` is true the committed layout stays mounted.
 * When it clears, the live media query is applied, not the value from when defer began.
 */
export function useMobileCardLayout(deferSwitch: boolean): boolean {
  const matches = useMediaQuery(MOBILE_CARD_QUERY);
  const [committed, setCommitted] = useState(matches);
  if (!deferSwitch && committed !== matches) {
    setCommitted(matches);
  }
  const cards = deferSwitch ? committed : matches;
  const previous = useRef(cards);

  useEffect(() => {
    if (previous.current === cards) return;
    previous.current = cards;
    scrollPageToTop();
  }, [cards]);

  return cards;
}
