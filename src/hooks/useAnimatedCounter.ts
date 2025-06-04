import { useState, useEffect } from "react";

interface UseAnimatedCounterProps {
  serverValue: number | null | undefined;
  isLoading: boolean;
  // Optional: Add decimals if it can vary per card and needs to be managed by the hook
  // decimals?: number;
}

interface UseAnimatedCounterReturn {
  displayValue: number;
  startAnimateValue: number;
}

export function useAnimatedCounter({
  serverValue,
  isLoading,
}: UseAnimatedCounterProps): UseAnimatedCounterReturn {
  const initialDisplayValue = serverValue ?? 0;

  const [displayValue, setDisplayValue] = useState<number>(initialDisplayValue);
  const [startAnimateValue, setStartAnimateValue] =
    useState<number>(initialDisplayValue);

  useEffect(() => {
    // This captures the value that CountUp is currently displaying or has finished animating to.
    const valueCurrentlyShown = displayValue;

    if (isLoading) {
      // While loading, we want CountUp to hold its current value.
      // So, we set the 'start' prop for the *next* animation (after loading finishes)
      // to be the value currently shown. 'displayValue' (the 'end' prop) remains unchanged.
      setStartAnimateValue(valueCurrentlyShown);
    } else {
      // Not loading. New serverValue might be available.
      // We want to animate from the 'valueCurrentlyShown' to the new 'serverValue'.
      setStartAnimateValue(valueCurrentlyShown);
      setDisplayValue(serverValue ?? 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverValue, isLoading]); // displayValue is intentionally omitted from deps here.
  // We want this effect to run based on serverValue/isLoading changes.
  // startAnimateValue is set based on the displayValue from the *previous* render cycle.

  return { displayValue, startAnimateValue };
}
