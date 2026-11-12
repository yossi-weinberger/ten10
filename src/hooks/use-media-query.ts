import * as React from "react";

/** Phones, including landscape: narrow, or a short coarse-pointer viewport.
 *  The assistant shell already uses this for its full-height drawer. */
export const COMPACT_VIEWPORT_QUERY =
  "(max-width: 767px), ((max-height: 500px) and (pointer: coarse))";

function mediaQueryList(query: string): MediaQueryList | null {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return null;
  }
  return window.matchMedia(query);
}

export function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(() => {
    // Initial check on mount to prevent hydration mismatch
    return mediaQueryList(query)?.matches ?? false;
  });

  React.useEffect(() => {
    const result = mediaQueryList(query);
    if (!result) return;

    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches);
    }

    result.addEventListener("change", onChange);

    // Final check to ensure we have the correct value
    setValue(result.matches);

    return () => result.removeEventListener("change", onChange);
  }, [query]);

  return value;
}
