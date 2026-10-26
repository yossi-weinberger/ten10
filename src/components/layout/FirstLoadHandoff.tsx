import { useState } from "react";
import AppLoader from "./AppLoader";

/**
 * The first-load handoff (#20, see llm-instructions/ui/brand-motion-guide.md): the
 * loader's symbol flies into the sidebar logo, then this removes itself. It keeps that
 * state here rather than in `App`, so finishing doesn't re-render the whole app.
 */
export const FirstLoadHandoff = () => {
  const [done, setDone] = useState(false);
  if (done) return null;
  return <AppLoader exiting onExited={() => setDone(true)} />;
};
