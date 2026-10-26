import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { BrandHandoffSymbol } from "@/components/brand/BrandHandoffSymbol";
import { BrandProgress } from "@/components/brand/BrandProgress";
import { BrandSpinner } from "@/components/brand/BrandSpinner";
import { BRAND_HANDOFF_TIMING } from "@/components/brand/brandHandoff.utils";
import { cn } from "@/lib/utils";

interface AppLoaderProps {
  /** Optional custom message; defaults to the global app startup message. */
  message?: string;
  /** Optional progress for import/export: the symbol fills up and "current / total" shows */
  progress?: { current: number; total: number };
  /** Optional extra details line under message */
  details?: string;
  /**
   * Play the first-load handoff instead of loading: the symbol flies into the sidebar
   * logo while the loader fades away. Rendered on top of the app, without blocking it.
   */
  exiting?: boolean;
  /** Called when the handoff has finished; unmount the loader then. */
  onExited?: () => void;
}

const AppLoader: React.FC<AppLoaderProps> = ({
  message,
  progress,
  details,
  exiting = false,
  onExited,
}) => {
  const { i18n, t } = useTranslation("common");
  const displayMessage =
    message ?? t("labels.appLoading", { defaultValue: t("labels.loading") });
  const hasProgress = !!progress && progress.total > 0;
  const progressPercent = hasProgress
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  // The handoff is over when both the symbol and the fading background are done.
  const pendingParts = useRef(new Set(["symbol", "backdrop"]));
  const partDone = (part: "symbol" | "backdrop") => {
    if (!pendingParts.current.delete(part)) return;
    if (pendingParts.current.size === 0) onExited?.();
  };

  const timing = BRAND_HANDOFF_TIMING;

  // One layout for loading and for the handoff, so the symbol and text don't move when
  // the loader turns into the handoff overlay.
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center",
        exiting ? "pointer-events-none" : "bg-background"
      )}
      dir={i18n.dir()}
      {...(exiting
        ? { "aria-hidden": true }
        : { role: "status", "aria-live": "polite" as const, "aria-busy": true })}
    >
      {exiting && (
        <motion.div
          className="absolute inset-0 -z-10 bg-background"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: timing.backdropDelay, duration: timing.backdropDuration }}
          onAnimationComplete={() => partDone("backdrop")}
        />
      )}
      {/* With known progress the symbol itself fills up: ring to 90%, slice for the rest. */}
      {exiting ? (
        <BrandHandoffSymbol onDone={() => partDone("symbol")} />
      ) : hasProgress ? (
        <BrandProgress value={progressPercent} />
      ) : (
        <BrandSpinner />
      )}
      <motion.div
        className="flex flex-col items-center"
        {...(exiting && {
          initial: { opacity: 1 },
          animate: { opacity: 0 },
          transition: { duration: timing.textFadeDuration },
        })}
      >
        <h1 className="mt-4 text-2xl font-bold text-primary">Ten10</h1>
        <p className="mt-4 text-muted-foreground">{displayMessage}</p>
        {details && (
          <p className="mt-2 text-sm text-muted-foreground">{details}</p>
        )}
        {hasProgress && (
          <p className="mt-2 text-center text-sm text-muted-foreground tabular-nums" dir="ltr">
            {progress.current} / {progress.total}
          </p>
        )}
      </motion.div>
    </div>
  );
};

export default AppLoader;
