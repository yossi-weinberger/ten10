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
      result.current.onPointerMove(createPointerEvent("pointermove", 80, 100));
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
      result.current.onPointerMove(createPointerEvent("pointermove", 170, 100));
    });

    act(() => {
      result.current.onPointerUp(createPointerEvent("pointerup", 170, 100));
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
      result.current.onPointerMove(createPointerEvent("pointermove", 130, 100));
    });

    act(() => {
      result.current.onPointerUp(createPointerEvent("pointerup", 130, 100));
    });

    expect(onSwipeEnd).toHaveBeenCalledWith(0);
  });

  it("should not allow negative offsets", () => {
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
      result.current.onPointerMove(createPointerEvent("pointermove", 80, 100));
    });

    expect(onSwipeMove).toHaveBeenCalledWith(0);
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
});
