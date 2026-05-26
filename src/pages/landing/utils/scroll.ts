export type ScrollTarget = HTMLElement | Window;

export const isWindowScrollTarget = (
  scrollTarget: ScrollTarget
): scrollTarget is Window => scrollTarget === window;

export const getScrollableParent = (
  element: HTMLElement | null
): ScrollTarget => {
  let parent = element?.parentElement ?? null;

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

