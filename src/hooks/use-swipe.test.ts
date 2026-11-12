// @vitest-environment jsdom

import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSwipe } from "./use-swipe";

describe("useSwipe", () => {
  const createPointerEvent = (type: string, clientX: number, clientY: number): React.PointerEvent => {
    return {
      type,
      clientX,
      clientY,
      preventDefault: vi.fn(),
      stopPropagation: vi.fn(),
    } as unknown as React.PointerEvent;
  };

  it("should lock to horizontal axis after threshold movement", () => {
    const onSwipeStart = vi.fn();
    const onSwipeMove = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeStart,
        onSwipeMove,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 120, 102));
    });

    expect(onSwipeStart).toHaveBeenCalled();
    expect(onSwipeMove).toHaveBeenCalled();
  });

  it("should lock to vertical axis and not trigger swipe", () => {
    const onSwipeStart = vi.fn();
    const onSwipeMove = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeStart,
        onSwipeMove,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 102, 120));
    });

    expect(onSwipeStart).not.toHaveBeenCalled();
  });

  it("should respect RTL direction", () => {
    const onSwipeMove = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeMove,
        isRTL: true,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 120, 100));
    });

    expect(onSwipeMove).toHaveBeenCalledWith(20);
  });

  it("should not trigger swipe when disabled", () => {
    const onSwipeStart = vi.fn();
    const onSwipeMove = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeStart,
        onSwipeMove,
        disabled: true,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 150, 100));
    });

    expect(onSwipeStart).not.toHaveBeenCalled();
    expect(onSwipeMove).not.toHaveBeenCalled();
  });

  it("should call onSwipeEnd with offset when threshold is reached", () => {
    const onSwipeEnd = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeEnd,
        threshold: 50,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 30, 100));
    });

    act(() => {
      result.current.onPointerUp(createPointerEvent("pointerup", 30, 100));
    });

    expect(onSwipeEnd).toHaveBeenCalledWith(70);
  });

  it("should call onSwipeEnd with 0 when threshold is not reached", () => {
    const onSwipeEnd = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeEnd,
        threshold: 50,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 70, 100));
    });

    act(() => {
      result.current.onPointerUp(createPointerEvent("pointerup", 70, 100));
    });

    expect(onSwipeEnd).toHaveBeenCalledWith(0);
  });

  it("reports a negative delta when the finger moves the close direction", () => {
    const onSwipeMove = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeMove,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 130, 100));
    });

    expect(onSwipeMove).toHaveBeenCalledWith(-30);
  });

  it("does not open when the finger moves toward inline-end in RTL", () => {
    const onSwipeMove = vi.fn();
    const onSwipeEnd = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeMove,
        onSwipeEnd,
        isRTL: true,
        threshold: 50,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 40, 100));
    });

    act(() => {
      result.current.onPointerUp(createPointerEvent("pointerup", 40, 100));
    });

    expect(onSwipeMove).toHaveBeenCalledWith(-60);
    expect(onSwipeEnd).toHaveBeenCalledWith(-60);
  });

  it("should clean up on cancel", () => {
    const onSwipeEnd = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeEnd,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 150, 100));
    });

    act(() => {
      result.current.onPointerCancel();
    });

    expect(onSwipeEnd).toHaveBeenCalledWith(0);
  });

  it("should update offset live during drag in LTR", () => {
    const onSwipeMove = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeMove,
        movementThreshold: 10,
        isRTL: false,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 70, 100));
    });

    expect(onSwipeMove).toHaveBeenCalledWith(30);

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 40, 100));
    });

    expect(onSwipeMove).toHaveBeenCalledWith(60);
  });

  it("should update offset live during drag in RTL", () => {
    const onSwipeMove = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeMove,
        movementThreshold: 10,
        isRTL: true,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 130, 100));
    });

    expect(onSwipeMove).toHaveBeenCalledWith(30);

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 160, 100));
    });

    expect(onSwipeMove).toHaveBeenCalledWith(60);
  });

  it("should snap to final offset when threshold is exceeded", () => {
    const onSwipeEnd = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeEnd,
        threshold: 50,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 20, 100));
    });

    act(() => {
      result.current.onPointerUp(createPointerEvent("pointerup", 20, 100));
    });

    expect(onSwipeEnd).toHaveBeenCalledWith(80);
  });

  it("should snap closed when threshold is not reached", () => {
    const onSwipeEnd = vi.fn();

    const { result } = renderHook(() =>
      useSwipe({
        onSwipeEnd,
        threshold: 50,
        movementThreshold: 10,
      })
    );

    act(() => {
      result.current.onPointerDown(createPointerEvent("pointerdown", 100, 100));
    });

    act(() => {
      result.current.onPointerMove(createPointerEvent("pointermove", 60, 100));
    });

    act(() => {
      result.current.onPointerUp(createPointerEvent("pointerup", 60, 100));
    });

    expect(onSwipeEnd).toHaveBeenCalledWith(0);
  });
});
