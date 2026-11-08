export type TermsSurface = "checking" | "blocking" | "clear";

let surface: TermsSurface = "checking";
const listeners = new Set<(surface: TermsSurface) => void>();

export function getTermsSurface(): TermsSurface {
  return surface;
}

export function publishTermsSurface(next: TermsSurface): void {
  if (surface === next) return;
  surface = next;
  for (const listener of listeners) listener(surface);
}

export function subscribeTermsSurface(
  handler: (surface: TermsSurface) => void,
): () => void {
  listeners.add(handler);
  handler(surface);
  return () => {
    listeners.delete(handler);
  };
}

/** Auto-opened What's New waits until the terms check has finished without a modal. */
export function whatsNewWaitsForTerms(current: TermsSurface): boolean {
  switch (current) {
    case "checking":
    case "blocking":
      return true;
    case "clear":
      return false;
    default: {
      const exhaustive: never = current;
      return exhaustive;
    }
  }
}

export function resetTermsSurfaceForTests(): void {
  surface = "checking";
  listeners.clear();
}
