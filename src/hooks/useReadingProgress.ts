import { useEffect, useState, type RefObject } from "react";
import { getScrollableParent, isWindowScrollTarget, type ScrollTarget } from "@/lib/utils/scroll";

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

/** The element itself if it scrolls, else its nearest scrolling ancestor, else the page. */
function findScroller(el: HTMLElement): ScrollTarget {
  return getScrollableParent(el, { includeSelf: true });
}

function measure(el: HTMLElement, scroller: ScrollTarget): number {
  // Content that scrolls itself: how far its own scroll has gone.
  if (scroller === el) {
    return getReadingProgress({
      contentTop: -el.scrollTop,
      contentHeight: el.scrollHeight,
      viewportTop: 0,
      viewportHeight: el.clientHeight,
    });
  }
  // Content inside a scrolling area or the page: where it sits in the visible part.
  const rect = el.getBoundingClientRect();
  const isPage = isWindowScrollTarget(scroller);
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
 *
 * The component that calls this re-renders on every percent, so call it from a small
 * component (the progress indicator), not from the page that holds the content.
 */
export function useReadingProgress(ref: RefObject<HTMLElement | null>): number {
  const [percent, setPercent] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Looked up when sizes change, not on every scroll frame (it reads computed styles).
    // A box that starts scrolling because its content grew shows up as a size change too.
    let scroller = findScroller(el);
    let frame = 0;
    let last = -1;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = Math.round(measure(el, scroller) * 100);
        // Most scroll frames don't change the whole-number percent; skip those renders.
        if (next === last) return;
        last = next;
        setPercent(next);
      });
    };
    const onResize = () => {
      scroller = findScroller(el);
      schedule();
    };
    // Scroll events don't bubble, but they do reach a capturing listener on the document.
    // Only the scroller's own scroll moves the content past the reader: an outer area
    // scrolling (e.g. the page around content that scrolls itself) changes nothing.
    const onScroll = (event: Event) => {
      const target = event.target === document ? window : event.target;
      if (target === scroller) schedule();
    };

    schedule();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(el);
    // When the element scrolls itself its box keeps its size as the content grows (an
    // answer opening), so watch its direct children too.
    for (const child of Array.from(el.children)) resizeObserver.observe(child);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
    };
  }, [ref]);

  return percent;
}
