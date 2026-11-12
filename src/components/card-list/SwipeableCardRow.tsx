import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type {
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { useReducedMotion } from "framer-motion";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLongPress } from "@/hooks/use-long-press";
import { useSwipe } from "@/hooks/use-swipe";
import { cn } from "@/lib/utils/formatting";

const SWIPE_ACTION_FALLBACK_WIDTH = 128;
const SWIPE_OPEN_THRESHOLD = 50;
const SWIPE_RELEASE_MS = 200;

// More than one strip can be revealed during a handoff between cards.
let revealedSwipeStrips = 0;

function setSwipeStripCover(active: boolean): void {
  revealedSwipeStrips = Math.max(0, revealedSwipeStrips + (active ? 1 : -1));
  if (revealedSwipeStrips > 0) {
    document.body.dataset.mobileSwipeOpen = "true";
  } else {
    delete document.body.dataset.mobileSwipeOpen;
  }
}

function clampOpenOffset(value: number, width: number): number {
  return Math.min(Math.max(value, 0), width);
}

// Positive openOffset reveals inline-end actions. LTR content moves left;
// RTL content moves right, so the same offset is mirrored.
function contentTranslateX(openOffset: number, isRTL: boolean): number {
  return isRTL ? openOffset : -openOffset;
}

function parseTranslateX(transform: string): number | null {
  if (!transform || transform === "none") return null;
  const translate = /translate(?:3d|X)\(\s*([-\d.]+)px/.exec(transform);
  if (translate) return Number(translate[1]);
  const matrix = /matrix(?:3d)?\(([^)]+)\)/.exec(transform);
  if (!matrix) return null;
  const parts = matrix[1].split(",").map((part) => Number(part.trim()));
  const value = parts.length === 16 ? parts[12] : parts[4];
  return Number.isFinite(value) ? value : null;
}

// Prefer the painted position. Falling back to the specified transform covers
// environments that do not interpolate transitions.
function visualOpenOffset(el: HTMLElement, isRTL: boolean, width: number): number {
  const painted = parseTranslateX(window.getComputedStyle(el).transform);
  const specified = parseTranslateX(el.style.transform);
  const x = painted ?? specified ?? 0;
  return clampOpenOffset(isRTL ? x : -x, width);
}

export interface SwipeCardAction {
  icon: ReactNode;
  label: string;
  variant?: ButtonProps["variant"];
  disabled?: boolean;
  onClick: () => void;
}

export interface SwipeableCardRowProps {
  id: string;
  actions: readonly SwipeCardAction[];
  children: ReactNode;
  surfaceClassName?: string;
  isSelected: boolean;
  inSelectionMode: boolean;
  selectionDisabled: boolean;
  onToggleSelected?: (id: string) => void;
  onActivate: () => void;
  onKeyDown: (event: ReactKeyboardEvent) => void;
  longPressTriggeredRef: { current: boolean };
  isRTL: boolean;
  openId: string | null;
  onSwipeOpen: (id: string) => void;
  onSwipeClose: () => void;
}

export function SwipeableCardRow({
  id,
  actions,
  children,
  surfaceClassName,
  isSelected,
  inSelectionMode,
  selectionDisabled,
  onToggleSelected,
  onActivate,
  onKeyDown,
  longPressTriggeredRef,
  isRTL,
  openId,
  onSwipeOpen,
  onSwipeClose,
}: SwipeableCardRowProps) {
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const swipeTriggeredRef = useRef(false);
  const dragBaseRef = useRef(0);
  if (inSelectionMode && isDragging) {
    setIsDragging(false);
  }
  const actionsRef = useRef<HTMLDivElement>(null);
  const [actionButtonsWidth, setActionButtonsWidth] = useState(SWIPE_ACTION_FALLBACK_WIDTH);
  const isSwipeOpen = openId === id;
  // Inert only while the row is closed. Dragging or open stays opaque and
  // clickable; disabled would fade the buttons.
  const actionsInert = inSelectionMode || (!isDragging && !isSwipeOpen);
  const reduceMotion = useReducedMotion();

  const isMobileSwipeEnabled = typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(max-width: 767px) and (pointer: coarse)").matches;

  const logicalOffset =
    isMobileSwipeEnabled && !inSelectionMode && (isDragging || isSwipeOpen)
      ? swipeOffset
      : 0;
  const targetX = isMobileSwipeEnabled ? contentTranslateX(logicalOffset, isRTL) : 0;
  const contentRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const renderedXRef = useRef(targetX);
  // Hidden at rest. A close keeps the strip painted until the release ends,
  // while pointer events and aria-hidden drop immediately via actionsInert.
  const [actionsHidden, setActionsHidden] = useState(true);
  const rowClosed = !isDragging && !isSwipeOpen;
  if (!rowClosed && actionsHidden) {
    setActionsHidden(false);
  }
  const actionsConcealed = actionsHidden && rowClosed;

  useEffect(() => {
    if (actionsConcealed) return;
    setSwipeStripCover(true);
    return () => setSwipeStripCover(false);
  }, [actionsConcealed]);

  // A transition added in the same commit as translateX does not run. Rewind
  // to the painted offset, flush layout, then ease. The no-ease branch still
  // writes translateX: React skips the style prop when the string is unchanged,
  // which leaves an interrupted drag pinned off the finger.
  useLayoutEffect(() => {
    const el = contentRef.current;
    if (!el) {
      renderedXRef.current = targetX;
      return;
    }
    const releaseInFlight = el.style.transition.includes("transform");
    const painted = releaseInFlight
      ? parseTranslateX(window.getComputedStyle(el).transform)
      : null;
    const from = painted ?? renderedXRef.current;
    renderedXRef.current = targetX;
    const shouldEase = !isDragging && reduceMotion === false && from !== targetX;
    const closed = !isDragging && !isSwipeOpen;
    if (!shouldEase) {
      el.style.transition = isDragging || reduceMotion !== false ? "none" : "";
      el.style.transform = `translateX(${targetX}px)`;
      if (!closed) return;
      const hide = window.setTimeout(() => setActionsHidden(true), 0);
      return () => window.clearTimeout(hide);
    }
    el.style.transition = "none";
    el.style.transform = `translateX(${from}px)`;
    void el.getBoundingClientRect();
    el.style.transition = `transform ${SWIPE_RELEASE_MS}ms ease-out`;
    el.style.transform = `translateX(${targetX}px)`;
    const timer = window.setTimeout(() => {
      el.style.transition = "";
      if (closed) setActionsHidden(true);
    }, SWIPE_RELEASE_MS);
    return () => window.clearTimeout(timer);
  }, [isDragging, isSwipeOpen, reduceMotion, targetX]);

  useEffect(() => {
    if (isMobileSwipeEnabled && actionsRef.current) {
      const width = actionsRef.current.offsetWidth;
      if (width > 0) {
        setActionButtonsWidth(width);
      }
    }
  }, [isMobileSwipeEnabled]);

  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (!selectionDisabled && onToggleSelected) {
        longPressTriggeredRef.current = true;
        onToggleSelected(id);
      }
    },
    onCancel: () => {
      longPressTriggeredRef.current = false;
    },
    threshold: 450,
    movementThreshold: 10,
  });

  const swipeHandlers = useSwipe({
    onSwipeStart: () => {
      const el = contentRef.current;
      const visualOffset = el
        ? visualOpenOffset(el, isRTL, actionButtonsWidth)
        : (isSwipeOpen ? swipeOffset : 0);
      const pinnedX = contentTranslateX(visualOffset, isRTL);
      dragBaseRef.current = visualOffset;
      renderedXRef.current = pinnedX;
      if (el) {
        el.style.transition = "none";
        el.style.transform = `translateX(${pinnedX}px)`;
      }
      setSwipeOffset(visualOffset);
      setIsDragging(true);
      swipeTriggeredRef.current = true;
    },
    onSwipeMove: (delta) => {
      const next = clampOpenOffset(dragBaseRef.current + delta, actionButtonsWidth);
      setSwipeOffset(next);
    },
    onSwipeEnd: (delta) => {
      setIsDragging(false);
      const blocked = inSelectionMode || !isMobileSwipeEnabled;
      const next = blocked
        ? 0
        : clampOpenOffset(dragBaseRef.current + delta, actionButtonsWidth);
      if (!blocked && next >= SWIPE_OPEN_THRESHOLD) {
        setSwipeOffset(actionButtonsWidth);
        onSwipeOpen(id);
      } else {
        setSwipeOffset(0);
        if (isSwipeOpen) {
          onSwipeClose();
        }
      }
      setTimeout(() => {
        swipeTriggeredRef.current = false;
      }, 100);
    },
    threshold: SWIPE_OPEN_THRESHOLD,
    movementThreshold: 10,
    isRTL,
    disabled: inSelectionMode || !isMobileSwipeEnabled,
  });

  const handlePointerDown = (event: ReactPointerEvent) => {
    longPressTriggeredRef.current = false;
    swipeTriggeredRef.current = false;
    longPressHandlers.onPointerDown(event);
    swipeHandlers.onPointerDown(event);
  };

  const handlePointerMove = (event: ReactPointerEvent) => {
    longPressHandlers.onPointerMove(event);
    swipeHandlers.onPointerMove(event);
  };

  const handlePointerUp = (event: ReactPointerEvent) => {
    const wasSwipeActive = swipeTriggeredRef.current;
    longPressHandlers.onPointerUp(event);
    swipeHandlers.onPointerUp(event);

    if (wasSwipeActive && inSelectionMode) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handlePointerCancel = () => {
    longPressTriggeredRef.current = false;
    const wasSwipeActive = swipeTriggeredRef.current;
    swipeTriggeredRef.current = false;
    setIsDragging(false);
    longPressHandlers.onPointerCancel();
    swipeHandlers.onPointerCancel();

    if (wasSwipeActive) {
      setSwipeOffset(0);
      if (isSwipeOpen) {
        onSwipeClose();
      }
    }
  };

  const handleContextMenu = (event: ReactMouseEvent) => {
    const isTouch = (event.nativeEvent instanceof PointerEvent && event.nativeEvent.pointerType === "touch")
      || window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) {
      event.preventDefault();
    }
  };

  const handleCardClick = () => {
    if (swipeTriggeredRef.current || longPressTriggeredRef.current) {
      swipeTriggeredRef.current = false;
      longPressTriggeredRef.current = false;
      return;
    }
    if (isSwipeOpen) {
      onSwipeClose();
      return;
    }
    onActivate();
  };

  const releaseStripFocus = () => {
    const active = document.activeElement;
    if (active instanceof Node && actionsRef.current?.contains(active)) {
      cardRef.current?.focus();
    }
  };

  const handleActionClick = (event: ReactMouseEvent, action: SwipeCardAction) => {
    event.stopPropagation();
    if (actionsInert || action.disabled) return;
    action.onClick();
    onSwipeClose();
    releaseStripFocus();
  };

  const card = (
      <Card
        ref={cardRef}
        role="button"
        tabIndex={0}
        aria-selected={inSelectionMode ? isSelected : undefined}
        aria-pressed={inSelectionMode ? isSelected : undefined}
        className={cn(
          "flex min-h-[64px] cursor-pointer items-center gap-3 p-3 hover:shadow-md active:scale-[0.99] select-none [-webkit-touch-callout:none] max-md:[@media(pointer:coarse)]:touch-pan-y",
          surfaceClassName,
          isSelected && "ring-2 ring-primary ring-offset-2"
        )}
        onClick={handleCardClick}
        onKeyDown={onKeyDown}
        onContextMenu={handleContextMenu}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {children}
      </Card>
  );

  return (
    <div
      className="relative max-md:[@media(pointer:coarse)]:isolate max-md:[@media(pointer:coarse)]:overflow-hidden"
      data-swipe-row={id}
    >
      <div
        ref={actionsRef}
        className={cn(
          "hidden max-md:[@media(pointer:coarse)]:absolute max-md:[@media(pointer:coarse)]:inset-y-0 max-md:[@media(pointer:coarse)]:end-0 max-md:[@media(pointer:coarse)]:z-0 max-md:[@media(pointer:coarse)]:flex max-md:[@media(pointer:coarse)]:items-stretch max-md:[@media(pointer:coarse)]:gap-2 max-md:[@media(pointer:coarse)]:ps-2",
          actionsConcealed && "max-md:[@media(pointer:coarse)]:invisible",
          actionsInert && "pointer-events-none"
        )}
        aria-hidden={actionsInert}
      >
        {actions.map((action, index) => (
          <Button
            key={`${action.label}-${index}`}
            variant={action.variant}
            size="icon"
            className="h-full w-14 min-w-[44px] rounded-lg flex-col gap-0.5 [&_svg]:size-5"
            onClick={(event) => handleActionClick(event, action)}
            tabIndex={actionsInert ? -1 : 0}
            aria-label={action.label}
            {...(action.disabled ? { disabled: true } : {})}
          >
            {action.icon}
            <span className="text-[11px] leading-tight">{action.label}</span>
          </Button>
        ))}
      </div>
      {isMobileSwipeEnabled ? (
        <div
          ref={contentRef}
          className={cn(
            "relative z-10",
            !isDragging && reduceMotion === false && "transition-transform duration-200 ease-out"
          )}
          style={{ transform: `translateX(${targetX}px)` }}
        >
          {card}
        </div>
      ) : (
        card
      )}
    </div>
  );
}
