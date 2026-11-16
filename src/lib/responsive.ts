export const MOBILE_COMPACT_QUERY = "(max-width: 767px), (pointer: coarse) and (max-height: 500px)";

/** Card list versus the desktop table. Narrow windows and short touch screens both use cards. */
export const MOBILE_CARD_QUERY = MOBILE_COMPACT_QUERY;

/** Touch pointer. The swipe gesture and its action strip require this as well as the card layout. */
export const COARSE_POINTER_QUERY = "(pointer: coarse)";

/**
 * Space below a list while the fixed mobile bulk bar is showing.
 * At 320px the bar wraps and, with the home-indicator inset, covers Load More.
 */
export const MOBILE_SELECTION_CLEARANCE_CLASS =
  "max-md:pb-[calc(11rem+env(safe-area-inset-bottom))]";

/** Shared mobile page nav control (show recurring / back to transactions). */
export const MOBILE_PAGE_NAV_BUTTON_CLASS = "h-11 w-full gap-2";
