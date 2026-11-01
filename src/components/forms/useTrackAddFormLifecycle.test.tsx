// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { StrictMode, useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import { useTrackAddFormLifecycle } from "./useTrackAddFormLifecycle";

vi.mock("@/lib/analytics/productAnalytics", () => ({
  trackProductEvent: vi.fn(),
}));

function Probe({ isEditMode }: { isEditMode: boolean }) {
  const formSavedSuccessRef = useRef(false);
  useTrackAddFormLifecycle(isEditMode, () => formSavedSuccessRef.current);
  return null;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useTrackAddFormLifecycle", () => {
  it("does not fire abandon on StrictMode remount, and does fire on real unmount", async () => {
    const { unmount } = render(
      <StrictMode>
        <Probe isEditMode={false} />
      </StrictMode>,
    );

    await Promise.resolve();

    expect(trackProductEvent).toHaveBeenCalledWith("add_transaction_form_opened");
    expect(trackProductEvent).not.toHaveBeenCalledWith(
      "add_transaction_form_abandoned",
    );

    unmount();
    await Promise.resolve();

    expect(trackProductEvent).toHaveBeenCalledWith(
      "add_transaction_form_abandoned",
    );
  });

  it("does not fire open or abandon in edit mode", async () => {
    const { unmount } = render(
      <StrictMode>
        <Probe isEditMode={true} />
      </StrictMode>,
    );

    await Promise.resolve();
    unmount();
    await Promise.resolve();

    expect(trackProductEvent).not.toHaveBeenCalled();
  });
});
