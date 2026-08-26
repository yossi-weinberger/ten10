import { describe, expect, it, vi } from "vitest";
import {
  notifyOnboardingTransactionCreated,
  subscribeOnboardingTransactionCreated,
} from "./transactionBridge";

describe("onboarding transaction bridge", () => {
  it("notifies subscribers without leaking payload data", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeOnboardingTransactionCreated(listener);

    notifyOnboardingTransactionCreated();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith();

    unsubscribe();
    notifyOnboardingTransactionCreated();
    expect(listener).toHaveBeenCalledTimes(1);
  });
});
