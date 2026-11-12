/** 24px assistant-button offset + 56px button + 8px gap. */
export const SORT_MENU_FAB_CLEARANCE = 88;
/** About 1.5 min-h-11 rows. Less usable space than this opens upward. */
export const SORT_MENU_MIN_DOWN_SPACE = 56;
/** Gap between an upward menu and the viewport edge, before the header. */
export const SORT_MENU_VIEWPORT_GAP = 8;
/** Mobile top bar (`--mobile-topbar-h` without the safe-area inset). */
export const SORT_MENU_HEADER_CLEARANCE = 52;

export interface SortMenuPlacementInput {
  triggerTop: number;
  triggerBottom: number;
  viewportHeight: number;
  /** `env(safe-area-inset-bottom)`, in pixels. */
  safeAreaBottom?: number;
  /** Resolved mobile top-bar height, in pixels. */
  headerClearance?: number;
}

export interface SortMenuPlacement {
  side: "top" | "bottom";
  maxHeight: number;
}

/**
 * Pick a side from the trigger rect. Radix flip is not used: a tall minimum
 * height was flipping the at-rest menu over the header.
 */
export function decideSortMenuPlacement(
  input: SortMenuPlacementInput,
): SortMenuPlacement {
  const safeAreaBottom = input.safeAreaBottom ?? 0;
  const headerClearance = input.headerClearance ?? SORT_MENU_HEADER_CLEARANCE;
  const spaceBelow =
    input.viewportHeight -
    input.triggerBottom -
    SORT_MENU_FAB_CLEARANCE -
    safeAreaBottom;

  if (spaceBelow >= SORT_MENU_MIN_DOWN_SPACE) {
    return { side: "bottom", maxHeight: spaceBelow };
  }

  return {
    side: "top",
    maxHeight: Math.max(
      0,
      input.triggerTop - SORT_MENU_VIEWPORT_GAP - headerClearance,
    ),
  };
}
