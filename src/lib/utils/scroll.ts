export type ScrollTarget = HTMLElement | Window;

export const isWindowScrollTarget = (
  scrollTarget: ScrollTarget
): scrollTarget is Window => scrollTarget === window;

/**
 * The nearest ancestor that scrolls vertically, or `window` when only the page scrolls.
 * With `includeSelf`, the element itself counts too (content that scrolls itself).
 */
export const getScrollableParent = (
  element: HTMLElement | null,
  { includeSelf = false }: { includeSelf?: boolean } = {}
): ScrollTarget => {
  let parent = (includeSelf ? element : element?.parentElement) ?? null;

  while (parent) {
    const { overflowY } = window.getComputedStyle(parent);
    const canScroll = parent.scrollHeight > parent.clientHeight;

    if (canScroll && (overflowY === "auto" || overflowY === "scroll")) {
      return parent;
    }

    parent = parent.parentElement;
  }

  return window;
};

export const getScrollTop = (scrollTarget: ScrollTarget) =>
  isWindowScrollTarget(scrollTarget) ? window.scrollY : scrollTarget.scrollTop;

