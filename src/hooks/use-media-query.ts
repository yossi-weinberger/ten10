import * as React from "react";

export function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(() => {
    // Initial check on mount to prevent hydration mismatch
    if (typeof window !== "undefined") {
      return window.matchMedia(query).matches;
    }
    return false;
  });

  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    const result = matchMedia(query);
    result.addEventListener("change", onChange);

    // Final check to ensure we have the correct value
    setValue(result.matches);

    return () => result.removeEventListener("change", onChange);
  }, [query]);

  return value;
}
