import { useEffect, useState, type RefObject } from "react";

export interface ReadingProgressMetrics {
  /** Top of the content, in viewport pixels (above the scroller's top once scrolled). */
  contentTop: number;
  /** Full height of the content. */
  contentHeight: number;
  /** Top of the visible area of the scroller, in viewport pixels. */
  viewportTop: number;
  /** Height of the visible area of the scroller. */
  viewportHeight: number;
}

/**
 * How much of a block of content has been read, 0–1: 0 while its top is at the top of
 * the visible area, 1 once its bottom reaches the bottom. Content that fits entirely
 * counts as read.
 */
export function getReadingProgress({
  contentTop,
  contentHeight,
  viewportTop,
  viewportHeight,
}: ReadingProgressMetrics): number {
  const scrollable = contentHeight - viewportHeight;
  if (scrollable <= 0) return 1;
  return Math.min(Math.max((viewportTop - contentTop) / scrollable, 0), 1);
}

function isScrollable(el: Element): boolean {
  const { overflowY } = getComputedStyle(el);
  return /(auto|scroll)/.test(overflowY) && el.scrollHeight > el.clientHeight;
}

/** The element itself if it scrolls, else its nearest scrolling ancestor, else the page. */
function findScroller(el: HTMLElement): Element {
  for (let node: HTMLElement | null = el; node; node = node.parentElement) {
    if (isScrollable(node)) return node;
  }
  return document.scrollingElement ?? document.documentElement;
}

function measure(el: HTMLElement): number {
  const scroller = findScroller(el);
  if (scroller === el) {
    const rect = el.getBoundingClientRect();
    return getReadingProgress({
      contentTop: rect.top - el.scrollTop,
      contentHeight: el.scrollHeight,
      viewportTop: rect.top,
      viewportHeight: el.clientHeight,
    });
  }
  const rect = el.getBoundingClientRect();
  const isPage = scroller === document.scrollingElement || scroller === document.documentElement;
  return getReadingProgress({
    contentTop: rect.top,
    contentHeight: rect.height,
    viewportTop: isPage ? 0 : scroller.getBoundingClientRect().top,
    viewportHeight: isPage ? window.innerHeight : scroller.clientHeight,
  });
}

/**
 * Reading progress (0–100, whole numbers) of the element in `ref`. Works whether the
 * element scrolls itself or sits inside a scrolling ancestor (the app's main area),
 * and follows changes in its height, e.g. accordions opening.
 */
export function useReadingProgress(ref: RefObject<HTMLElement | null>): number {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setPercent(Math.round(measure(el) * 100)));
    };

    update();
    // Scroll events don't bubble, but they do reach a capturing listener on the document.
    document.addEventListener("scroll", update, { capture: true, passive: true });
    window.addEventListener("resize", update);
    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("scroll", update, { capture: true });
      window.removeEventListener("resize", update);
      resizeObserver.disconnect();
    };
  }, [ref]);

  return percent;
}
