/** 24px assistant-button offset + 56px button + 8px gap. */
export const SORT_MENU_FAB_CLEARANCE = 88;
/** Three min-h-11 rows. A side with less usable space than this is the fallback. */
export const SORT_MENU_MIN_SIDE_SPACE = 132;
/** Gap between an upward menu and the top bar. */
export const SORT_MENU_VIEWPORT_GAP = 8;
/**
 * Fallback when `--mobile-topbar-h` is unset.
 * That variable already includes the safe-area inset.
 */
export const SORT_MENU_HEADER_CLEARANCE = 52;

export interface SortMenuPlacementInput {
  triggerTop: number;
  triggerBottom: number;
  viewportHeight: number;
  /** `env(safe-area-inset-bottom)`, in pixels. */
  safeAreaBottom?: number;
  /** Resolved `--mobile-topbar-h`, in pixels. */
  headerClearance?: number;
}

export interface SortMenuPlacement {
  side: "top" | "bottom";
  maxHeight: number;
}

/**
 * Open downward when three rows fit under the trigger.
 * Otherwise open under the top bar when that side fits three rows.
 * When neither side fits, use the side with more room.
 */
export function decideSortMenuPlacement(
  input: SortMenuPlacementInput,
): SortMenuPlacement {
  const safeAreaBottom = input.safeAreaBottom ?? 0;
  const headerClearance = input.headerClearance ?? SORT_MENU_HEADER_CLEARANCE;
  const spaceBelow = Math.max(
    0,
    input.viewportHeight -
      input.triggerBottom -
      SORT_MENU_FAB_CLEARANCE -
      safeAreaBottom,
  );
  const spaceAbove = Math.max(
    0,
    input.triggerTop - SORT_MENU_VIEWPORT_GAP - headerClearance,
  );

  if (spaceBelow >= SORT_MENU_MIN_SIDE_SPACE) {
    return { side: "bottom", maxHeight: spaceBelow };
  }
  if (spaceAbove >= SORT_MENU_MIN_SIDE_SPACE) {
    return { side: "top", maxHeight: spaceAbove };
  }
  if (spaceAbove > spaceBelow) {
    return { side: "top", maxHeight: spaceAbove };
  }
  return { side: "bottom", maxHeight: spaceBelow };
}
