import { useEffect, useRef, useState } from "react";

interface BodyStyleSnapshot {
  pointerEvents: string;
  overflow: string;
}

/**
 * If an overlay is still open when this component unmounts, put body
 * pointer-events and overflow back to the values from before it opened.
 * The snapshot is taken during render, before the overlay's effects lock the body.
 */
export function useRestoreOverlayOnUnmount(open: boolean): void {
  const [snapshot, setSnapshot] = useState<BodyStyleSnapshot | null>(null);
  if (open && snapshot == null) {
    setSnapshot({
      pointerEvents: document.body.style.pointerEvents,
      overflow: document.body.style.overflow,
    });
  } else if (!open && snapshot != null) {
    setSnapshot(null);
  }

  const openRef = useRef(open);
  const snapshotRef = useRef(snapshot);
  useEffect(() => {
    openRef.current = open;
    snapshotRef.current = snapshot;
  });

  useEffect(() => {
    return () => {
      const saved = snapshotRef.current;
      if (!openRef.current || !saved) return;
      document.body.style.pointerEvents = saved.pointerEvents;
      document.body.style.overflow = saved.overflow;
      document.body.removeAttribute("data-scroll-locked");
    };
  }, []);
}
