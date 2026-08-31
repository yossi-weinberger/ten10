import { useEffect, useRef, useState } from "react";

export function useAdminCurrencySelection(currencies: string[]) {
  const [selected, setSelected] = useState<string[]>([]);
  const previousKeyRef = useRef("");
  const key = currencies.join("\0");

  useEffect(() => {
    if (key === previousKeyRef.current) return;
    const previousCodes = previousKeyRef.current
      ? previousKeyRef.current.split("\0")
      : [];
    previousKeyRef.current = key;

    setSelected((prev) => {
      if (prev.length === 0 && previousCodes.length === 0) {
        return currencies;
      }
      const kept = prev.filter((code) => currencies.includes(code));
      const added = currencies.filter((code) => !prev.includes(code));
      return [...kept, ...added];
    });
  }, [currencies, key]);

  return [selected, setSelected] as const;
}
