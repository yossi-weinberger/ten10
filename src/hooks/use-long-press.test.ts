// @vitest-environment jsdom

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLongPress } from "./use-long-press";

describe("useLongPress", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("triggers onLongPress after threshold ms", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, threshold: 450 })
    );

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerDown(mockEvent);
    });

    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("does not trigger onLongPress if pointer is released before threshold", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, threshold: 450 })
    );

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerDown(mockEvent);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      result.current.onPointerUp({} as React.PointerEvent);
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("calls onCancel when pointer is released before threshold", () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, onCancel, threshold: 450 })
    );

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerDown(mockEvent);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      result.current.onPointerUp({} as React.PointerEvent);
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels when pointer moves beyond movement threshold", () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, onCancel, threshold: 450, movementThreshold: 10 })
    );

    const startEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerDown(startEvent);
    });

    const moveEvent = {
      clientX: 120,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerMove(moveEvent);
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("does not cancel when pointer moves within threshold", () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, onCancel, threshold: 450, movementThreshold: 10 })
    );

    const startEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerDown(startEvent);
    });

    const moveEvent = {
      clientX: 105,
      clientY: 103,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerMove(moveEvent);
    });

    expect(onCancel).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("cancels when scroll event occurs", () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, onCancel, threshold: 450 })
    );

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerDown(mockEvent);
    });

    act(() => {
      const scrollEvent = new Event("scroll");
      window.dispatchEvent(scrollEvent);
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("cancels on pointerCancel event", () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, onCancel, threshold: 450 })
    );

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerDown(mockEvent);
    });

    act(() => {
      vi.advanceTimersByTime(200);
    });

    act(() => {
      result.current.onPointerCancel();
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("uses default threshold of 450ms when not specified", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() => useLongPress({ onLongPress }));

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerDown(mockEvent);
    });

    act(() => {
      vi.advanceTimersByTime(449);
    });

    expect(onLongPress).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(1);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("uses default movementThreshold of 10px when not specified", () => {
    const onLongPress = vi.fn();
    const onCancel = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, onCancel })
    );

    const startEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerDown(startEvent);
    });

    const moveEventWithin = {
      clientX: 109,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerMove(moveEventWithin);
    });

    expect(onCancel).not.toHaveBeenCalled();

    const moveEventBeyond = {
      clientX: 111,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerMove(moveEventBeyond);
    });

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("can handle multiple pointer down cycles", () => {
    const onLongPress = vi.fn();
    const { result } = renderHook(() =>
      useLongPress({ onLongPress, threshold: 450 })
    );

    const mockEvent = {
      clientX: 100,
      clientY: 100,
    } as React.PointerEvent;

    act(() => {
      result.current.onPointerDown(mockEvent);
    });

    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(onLongPress).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.onPointerDown(mockEvent);
    });

    act(() => {
      vi.advanceTimersByTime(450);
    });

    expect(onLongPress).toHaveBeenCalledTimes(2);
  });
});
