import { useCallback, useEffect, useRef } from "react";

export interface UseLongPressOptions {
  onLongPress: () => void;
  onCancel?: () => void;
  threshold?: number;
  movementThreshold?: number;
}

export interface UseLongPressResult {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onPointerCancel: () => void;
}

export function useLongPress({
  onLongPress,
  onCancel,
  threshold = 450,
  movementThreshold = 10,
}: UseLongPressOptions): UseLongPressResult {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTriggeredRef = useRef(false);
  const scrollListenerRef = useRef<(() => void) | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    startPosRef.current = null;
    longPressTriggeredRef.current = false;
    
    if (scrollListenerRef.current) {
      window.removeEventListener("scroll", scrollListenerRef.current, true);
      scrollListenerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const cancel = useCallback(() => {
    cleanup();
    onCancel?.();
  }, [cleanup, onCancel]);

  const onPointerDown = useCallback(
    (event: React.PointerEvent) => {
      cleanup();
      longPressTriggeredRef.current = false;
      startPosRef.current = { x: event.clientX, y: event.clientY };

      const handleScroll = () => {
        cancel();
      };

      scrollListenerRef.current = handleScroll;
      window.addEventListener("scroll", handleScroll, true);

      timerRef.current = setTimeout(() => {
        longPressTriggeredRef.current = true;
        cleanup();
        navigator.vibrate?.(10);
        onLongPress();
      }, threshold);
    },
    [cleanup, cancel, onLongPress, threshold]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!startPosRef.current || longPressTriggeredRef.current) {
        return;
      }

      const deltaX = Math.abs(event.clientX - startPosRef.current.x);
      const deltaY = Math.abs(event.clientY - startPosRef.current.y);

      if (deltaX > movementThreshold || deltaY > movementThreshold) {
        cancel();
      }
    },
    [cancel, movementThreshold]
  );

  const onPointerUp = useCallback(() => {
    if (!longPressTriggeredRef.current && timerRef.current !== null) {
      cancel();
    } else {
      cleanup();
    }
  }, [cancel, cleanup]);

  const onPointerCancel = useCallback(() => {
    cancel();
  }, [cancel]);

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
  };
}
