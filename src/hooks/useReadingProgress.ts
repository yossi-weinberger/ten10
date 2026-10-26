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

/**
 * The box to measure against after `target` scrolled, or null when that scroll didn't
 * move the content. Progress is measured against the nearest scrolling box: an outer area
 * scrolling (e.g. the page around a content box that scrolls itself) never replaces it,
 * but a box nearer the content that starts scrolling (it grew past its max height) does.
 */
export function scrollerAfterScroll(
  current: Element,
  target: Element,
  content: Element
): Element | null {
  if (!target.contains(content)) return null;
  return current.contains(target) ? target : current;
}

function measure(el: HTMLElement, scroller: Element): number {
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
    const onScroll = (event: Event) => {
      const target = event.target === document ? document.scrollingElement : event.target;
      if (!(target instanceof Element)) return;
      const next = scrollerAfterScroll(scroller, target, el);
      if (!next) return;
      scroller = next;
      schedule();
    };

    schedule();
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onResize);
    const resizeObserver = new ResizeObserver(onResize);
    resizeObserver.observe(el);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onResize);
      resizeObserver.disconnect();
    };
  }, [ref]);

  return percent;
}
