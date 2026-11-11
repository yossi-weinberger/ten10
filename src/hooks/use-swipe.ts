import { useCallback, useRef } from "react";

export interface UseSwipeOptions {
  onSwipeStart?: () => void;
  onSwipeMove?: (offset: number) => void;
  onSwipeEnd?: (offset: number) => void;
  threshold?: number;
  movementThreshold?: number;
  isRTL?: boolean;
  disabled?: boolean;
}

export interface UseSwipeResult {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onPointerCancel: () => void;
}

export function useSwipe({
  onSwipeStart,
  onSwipeMove,
  onSwipeEnd,
  threshold = 10,
  movementThreshold = 10,
  isRTL = false,
  disabled = false,
}: UseSwipeOptions): UseSwipeResult {
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const currentOffsetRef = useRef(0);
  const axisLockedRef = useRef<"horizontal" | "vertical" | null>(null);
  const swipeActiveRef = useRef(false);

  const cleanup = useCallback(() => {
    startPosRef.current = null;
    currentOffsetRef.current = 0;
    axisLockedRef.current = null;
    swipeActiveRef.current = false;
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      if (disabled) return;

      cleanup();
      startPosRef.current = { x: event.clientX, y: event.clientY };
    },
    [cleanup, disabled]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (disabled || !startPosRef.current) return;

      const deltaX = event.clientX - startPosRef.current.x;
      const deltaY = event.clientY - startPosRef.current.y;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (!axisLockedRef.current && (absDeltaX > movementThreshold || absDeltaY > movementThreshold)) {
        axisLockedRef.current = absDeltaX > absDeltaY ? "horizontal" : "vertical";
        
        if (axisLockedRef.current === "horizontal") {
          swipeActiveRef.current = true;
          onSwipeStart?.();
        }
      }

      if (axisLockedRef.current === "horizontal" && swipeActiveRef.current) {
        event.preventDefault();
        event.stopPropagation();

        const logicalOffset = isRTL ? -deltaX : deltaX;
        
        if (logicalOffset >= 0) {
          currentOffsetRef.current = logicalOffset;
          onSwipeMove?.(logicalOffset);
        } else {
          currentOffsetRef.current = 0;
          onSwipeMove?.(0);
        }
      }
    },
    [disabled, isRTL, movementThreshold, onSwipeStart, onSwipeMove]
  );

  const onPointerUp = useCallback(() => {
    if (disabled) return;

    if (swipeActiveRef.current && axisLockedRef.current === "horizontal") {
      const finalOffset = currentOffsetRef.current;
      
      if (finalOffset > threshold) {
        onSwipeEnd?.(finalOffset);
      } else {
        onSwipeEnd?.(0);
      }
    }

    cleanup();
  }, [disabled, threshold, onSwipeEnd, cleanup]);

  const onPointerCancel = useCallback(() => {
    if (swipeActiveRef.current && axisLockedRef.current === "horizontal") {
      onSwipeEnd?.(0);
    }
    cleanup();
  }, [cleanup, onSwipeEnd]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
