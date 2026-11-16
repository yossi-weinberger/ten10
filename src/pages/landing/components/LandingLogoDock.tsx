import { useEffect, useId, useRef, useState, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import { useReducedMotion } from "framer-motion";
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { getScrollableParent, getScrollTop } from "@/lib/utils/scroll";
import {
  LOGO_FILE_COLORS,
  LOGO_LETTERS,
  LOGO_ZERO_CENTER,
  SYMBOL_RING_PATH,
  SYMBOL_SLICE_PATH,
  WIDE_LOGO_VIEWBOX,
} from "@/components/brand/logoPaths";
import {
  DOCK_CLIP_X,
  DOCK_TIMING,
  getCornerDock,
  getDockPose,
  getDockProgress,
  getDockWaitingSpot,
  getLogoPlacement,
  type Box,
  type DockPose,
  type DockTarget,
} from "@/components/brand/logoDock.utils";

interface LandingLogoDockProps {
  /** The landing page; the dock follows whatever scrolls it. */
  pageRef: RefObject<HTMLElement | null>;
  /** The hero logo's glass card and SVG (`AnimatedLogo`). */
  heroCardRef: RefObject<HTMLDivElement | null>;
  heroSvgRef: RefObject<SVGSVGElement | null>;
  /** The side navigation's logo, while the navigation is shown (2xl screens). */
  navLogoRef: RefObject<HTMLImageElement | null>;
  /** The page controls (language, theme), which the badge keeps clear of. */
  controlsRef: RefObject<HTMLElement | null>;
  /** Land in the side navigation's logo (2xl screens) or in the free top corner. */
  target: DockTarget;
  /** The docked corner button scrolls back to the top, like the navigation's home link. */
  onBackToTop: () => void;
}

const boxOf = (el: Element): Box => {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
};

const [VIEWBOX_X, VIEWBOX_Y, VIEWBOX_WIDTH, VIEWBOX_HEIGHT] = WIDE_LOGO_VIEWBOX;
const [ZERO_X, ZERO_Y] = LOGO_ZERO_CENTER.wide;

/**
 * Motion lab #38: as the landing page scrolls, the hero logo's letters reel into the 0,
 * its card collapses around it, and the badge flies to its dock: the side navigation's
 * logo on 2xl screens (where the letters reel back out), or a round button in the free
 * top corner that scrolls back to the top. Scrolling up reverses it.
 *
 * The badge is drawn in a fixed overlay that copies the hero logo exactly, so the hero
 * hides as soon as the page leaves the top. Positions are a pure function of the scroll
 * (`logoDock.utils.ts`), written straight to the DOM once per frame, without re-renders.
 * With reduced motion the hero logo stays put and the corner button just fades in.
 */
export const LandingLogoDock = ({
  pageRef,
  heroCardRef,
  heroSvgRef,
  navLogoRef,
  controlsRef,
  target,
  onBackToTop,
}: LandingLogoDockProps) => {
  const { t, i18n } = useTranslation("landing");
  const dir = i18n.dir();
  const reduceMotion = useReducedMotion();
  const narrow = useMediaQuery("(max-width: 767px)");
  const clipId = `landing-dock-clip-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const layerRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const logoRef = useRef<SVGSVGElement>(null);
  const lettersRef = useRef<SVGGElement>(null);
  const zeroRef = useRef<SVGGElement>(null);
  const [docked, setDocked] = useState(false);

  useEffect(() => {
    const scroller = getScrollableParent(pageRef.current);
    const timing = narrow ? DOCK_TIMING.narrow : DOCK_TIMING.wide;
    const heroCard = heroCardRef.current;
    const cardRadius = heroCard ? parseFloat(getComputedStyle(heroCard).borderTopLeftRadius) || 0 : 0;
    let frame = 0;
    // The hero and the side navigation have entrance animations; while their boxes still
    // move, keep updating after the scroll stops.
    let lastBoxes = "";
    let lastDocked: boolean | null = null; // the first frame always syncs the state

    const draw = (pose: DockPose) => {
      const card = cardRef.current!;
      card.style.transform = `translate(${pose.card.left}px, ${pose.card.top}px)`;
      card.style.width = `${pose.card.width}px`;
      card.style.height = `${pose.card.height}px`;
      card.style.borderRadius = `${pose.card.radius}px`;
      card.style.opacity = String(pose.card.opacity);
      const { zero, scale } = pose.logo;
      const left = zero.x - (ZERO_X - VIEWBOX_X) * scale;
      const top = zero.y - (ZERO_Y - VIEWBOX_Y) * scale;
      logoRef.current!.style.transform = `translate(${left}px, ${top}px) scale(${scale})`;
      lettersRef.current!.setAttribute("transform", `translate(${pose.letterShift} 0)`);
      zeroRef.current!.setAttribute("transform", `rotate(${pose.zeroTurn})`);
    };

    const update = () => {
      frame = 0;
      const layer = layerRef.current;
      const heroSvg = heroSvgRef.current;
      if (!layer || !heroCard || !heroSvg) return;

      const scroll = getScrollTop(scroller);
      // With reduced motion only the corner button is drawn: docked, fading in past the reel.
      const progress = reduceMotion
        ? { reel: 1, fly: 1, unreel: 0 }
        : getDockProgress(scroll, timing, target);
      const visible = reduceMotion ? target === "corner" && scroll > timing.fly[0] : scroll > 0.5;

      heroCard.style.visibility = visible && !reduceMotion ? "hidden" : "";
      layer.style.opacity = visible ? "1" : "0";
      const isDocked = visible && target === "corner" && progress.fly >= 1;
      if (isDocked !== lastDocked) {
        lastDocked = isDocked;
        setDocked(isDocked);
      }
      if (!visible) return;

      const navLogo = target === "nav" ? navLogoRef.current : null;
      const navBox = navLogo ? boxOf(navLogo) : null;
      const heroBox = boxOf(heroSvg);
      const boxes = JSON.stringify([navBox, heroBox.width, heroBox.left]);
      if (boxes !== lastBoxes) {
        lastBoxes = boxes;
        schedule();
      }
      const dock = navBox ? getLogoPlacement(navBox) : getCornerDock(window.innerWidth, dir);
      const hero = { ...getLogoPlacement(heroBox), card: boxOf(heroCard), cardRadius };
      const controls = controlsRef.current ? boxOf(controlsRef.current) : null;
      const spot = getDockWaitingSpot({ hero, viewportWidth: window.innerWidth, controls, dir });
      draw(getDockPose({ progress, target: navLogo ? "nav" : "corner", hero, dock, ...spot }));
    };

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    schedule();
    scroller.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      if (heroCard) heroCard.style.visibility = "";
    };
  }, [pageRef, heroCardRef, heroSvgRef, navLogoRef, controlsRef, target, reduceMotion, narrow, dir]);

  const { teal, gold } = LOGO_FILE_COLORS;

  return (
    <>
      <div
        ref={layerRef}
        aria-hidden="true"
        className={cn(
          "pointer-events-none fixed inset-0 z-[45] opacity-0",
          reduceMotion && "transition-opacity duration-200"
        )}
      >
        {/* The hero logo's glass card (same classes as AnimatedLogo), sized per frame. */}
        <div
          ref={cardRef}
          className="absolute left-0 top-0 border border-border/50 bg-card/70 shadow-lg backdrop-blur-md"
        />
        <svg
          ref={logoRef}
          viewBox={WIDE_LOGO_VIEWBOX.join(" ")}
          width={VIEWBOX_WIDTH}
          height={VIEWBOX_HEIGHT}
          className="absolute left-0 top-0 origin-top-left overflow-visible"
        >
          <defs>
            {/* Letters past the ring's left edge are inside the 0. */}
            <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
              <rect
                x={VIEWBOX_X - 10}
                y={VIEWBOX_Y - 20}
                width={DOCK_CLIP_X - VIEWBOX_X + 10}
                height={VIEWBOX_HEIGHT + 40}
              />
            </clipPath>
          </defs>
          <g clipPath={`url(#${clipId})`}>
            <g ref={lettersRef}>
              {LOGO_LETTERS.map((letter) => (
                <path key={letter.key} d={letter.path} fill={teal} />
              ))}
            </g>
          </g>
          <g transform={`translate(${ZERO_X} ${ZERO_Y})`}>
            <g ref={zeroRef}>
              <path d={SYMBOL_RING_PATH} fill={teal} />
              <path d={SYMBOL_SLICE_PATH} fill={gold} />
            </g>
          </g>
        </svg>
      </div>

      {/* The docked corner badge: back to the top. Matches getCornerDock (40px, 16px in). */}
      <button
        type="button"
        hidden={!docked}
        aria-label={t("backToTop")}
        onClick={onBackToTop}
        className={cn(
          "fixed top-4 z-[46] h-10 w-10 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          dir === "rtl" ? "left-4" : "right-4"
        )}
      />
    </>
  );
};
