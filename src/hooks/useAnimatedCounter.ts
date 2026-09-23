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
  const [isReady, setIsReady] = useState(!isLoading && serverValue != null);

  useEffect(() => {
    const valueCurrentlyShown = displayValue;
    const newServerValue = serverValue ?? 0;

    if (isLoading) {
      if (isReady) {
        setStartAnimateValue(valueCurrentlyShown);
      }
      return;
    }

    if (!isReady) {
      setStartAnimateValue(newServerValue);
      setDisplayValue(newServerValue);
      setIsReady(true);
      return;
    }

    const tolerance = 0.01;
    if (Math.abs(valueCurrentlyShown - newServerValue) > tolerance) {
      setStartAnimateValue(valueCurrentlyShown);
      setDisplayValue(newServerValue);
    }
    // displayValue and isReady are read from the render that started this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverValue, isLoading]);

  return { displayValue, isReady, startAnimateValue };
}
