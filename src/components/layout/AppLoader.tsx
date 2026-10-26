import React from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { BrandHandoffSymbol } from "@/components/brand/BrandHandoffSymbol";
import { BrandProgress } from "@/components/brand/BrandProgress";
import { BrandSpinner } from "@/components/brand/BrandSpinner";
import { BRAND_HANDOFF_TIMING } from "@/components/brand/brandHandoff.utils";

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

  if (exiting) {
    const timing = BRAND_HANDOFF_TIMING;
    const fadeText = { initial: { opacity: 1 }, animate: { opacity: 0 }, transition: { duration: timing.textFadeDuration } };
    return (
      <div
        className="fixed inset-0 flex flex-col items-center justify-center z-50 pointer-events-none"
        dir={i18n.dir()}
        aria-hidden="true"
      >
        <motion.div
          className="absolute inset-0 -z-10 bg-background"
          initial={{ opacity: 1 }}
          animate={{ opacity: 0 }}
          transition={{ delay: timing.backdropDelay, duration: timing.backdropDuration }}
        />
        <BrandHandoffSymbol className="h-14 w-14" onDone={onExited} />
        <motion.h1 className="mt-4 text-2xl font-bold text-primary" {...fadeText}>
          Ten10
        </motion.h1>
        <motion.p className="mt-4 text-muted-foreground" {...fadeText}>
          {displayMessage}
        </motion.p>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50"
      dir={i18n.dir()}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      {/* With known progress the symbol itself fills up: ring to 90%, slice for the rest. */}
      {hasProgress ? (
        <BrandProgress value={progressPercent} className="h-14 w-14" />
      ) : (
        <BrandSpinner className="h-14 w-14" />
      )}
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
    </div>
  );
};

export default AppLoader;
