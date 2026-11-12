export const MOBILE_COMPACT_QUERY = "(max-width: 767px), (pointer: coarse) and (max-height: 500px)";

/** Card/table switch and the swipe gate. One query so the two cannot disagree. */
export const MOBILE_CARD_QUERY = MOBILE_COMPACT_QUERY;

/**
 * Space below a list while the fixed mobile bulk bar is showing.
 * At 320px the bar wraps and, with the home-indicator inset, covers Load More.
 */
export const MOBILE_SELECTION_CLEARANCE_CLASS =
  "max-md:pb-[calc(11rem+env(safe-area-inset-bottom))]";
