import { describe, it, expect, vi, afterEach } from "vitest";
import { isValidElement } from "react";
import { ErrorBoundary } from "./ErrorBoundary";

/**
 * These tests exercise the boundary's own decision logic — the part this
 * component owns — in isolation: given an error in state it must render a
 * fallback, and with no error it must pass its children through. React
 * invoking getDerivedStateFromError / componentDidCatch on a real render
 * throw is a framework guarantee, not tested here.
 */
describe("ErrorBoundary", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("maps a caught error into fallback state", () => {
    const err = new Error("kaboom");
    expect(ErrorBoundary.getDerivedStateFromError(err)).toEqual({ error: err });
  });

  it("renders children when no error is present", () => {
    const child = <span>healthy</span>;
    const instance = new ErrorBoundary({ children: child });
    instance.state = { error: null };
    expect(instance.render()).toBe(child);
  });

  it("renders the custom fallback (not children) once an error is caught", () => {
    const child = <span>healthy</span>;
    const fallback = vi.fn(({ error }: { error: Error }) => (
      <span>caught: {error.message}</span>
    ));
    const err = new Error("kaboom");
    const instance = new ErrorBoundary({ children: child, fallback });

    instance.state = ErrorBoundary.getDerivedStateFromError(err);
    const output = instance.render();

    expect(fallback).toHaveBeenCalledWith(
      expect.objectContaining({ error: err })
    );
    expect(output).not.toBe(child);
    expect(isValidElement(output)).toBe(true);
  });

  it("reports the render fault to PostHog and logs it via componentDidCatch", async () => {
    const posthog = await import("@/lib/analytics/posthogClient");
    const logger = (await import("@/lib/logger")).logger;
    const captureSpy = vi
      .spyOn(posthog, "capturePostHogException")
      .mockImplementation(() => {});
    const logSpy = vi.spyOn(logger, "error").mockImplementation(() => {});

    const err = new Error("kaboom");
    const instance = new ErrorBoundary({
      children: null,
      boundaryName: "unit-test",
    });
    instance.componentDidCatch(err, { componentStack: "<Boom>" });

    expect(captureSpy).toHaveBeenCalledWith(
      err,
      expect.objectContaining({ boundary: "unit-test" })
    );
    expect(logSpy).toHaveBeenCalled();
  });
});
