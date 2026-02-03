import React from "react";
import { useTranslation } from "react-i18next";
import { Progress } from "@/components/ui/progress";

interface AppLoaderProps {
  /** Optional custom message; defaults to common "labels.loading" */
  message?: string;
  /** Optional progress for import/export: show progress bar and "current / total" */
  progress?: { current: number; total: number };
  /** Optional extra details line under message */
  details?: string;
}

const AppLoader: React.FC<AppLoaderProps> = ({
  message,
  progress,
  details,
}) => {
  const { t } = useTranslation("common");
  const displayMessage = message ?? t("labels.loading");
  const progressPercent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0;

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background z-50">
      <img
        src="/logo/symbol.svg"
        alt="Ten10 loading"
        className="h-12 w-12 animate-spin"
      />
      <h1 className="mt-3 text-2xl font-bold text-primary">Ten10</h1>
      <p className="mt-4 text-muted-foreground">{displayMessage}</p>
      {details && (
        <p className="mt-2 text-sm text-muted-foreground">{details}</p>
      )}
      {progress && progress.total > 0 && (
        <div className="mt-4 w-64 max-w-[80vw]">
          <Progress value={progressPercent} className="h-2" />
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {progress.current} / {progress.total}
          </p>
        </div>
      )}
    </div>
  );
};

export default AppLoader;
