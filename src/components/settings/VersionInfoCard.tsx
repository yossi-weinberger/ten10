import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  RefreshCw,
  Download,
  CheckCircle2,
  Info,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  getCurrentVersion,
  checkForUpdates,
  downloadAndInstallUpdate,
  type UpdateInfo,
} from "@/lib/data-layer/updater.service";
import toast from "react-hot-toast";

type CheckStatus =
  | "idle"
  | "checking"
  | "up-to-date"
  | "update-available"
  | "error";

export function VersionInfoCard() {
  const { t } = useTranslation("settings");
  const { platform } = usePlatform();

  const [currentVersion, setCurrentVersion] = useState<string>("");
  const [checkStatus, setCheckStatus] = useState<CheckStatus>("idle");
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [error, setError] = useState<string>("");

  // Load version on mount
  useEffect(() => {
    if (platform === "desktop") {
      getCurrentVersion()
        .then(setCurrentVersion)
        .catch((err) => {
          console.error("Failed to get version:", err);
          setCurrentVersion("Unknown");
        });
    }
  }, [platform]);

  const handleCheckForUpdates = async () => {
    if (platform !== "desktop") {
      return;
    }

    setCheckStatus("checking");
    setError("");
    setUpdateInfo(null);

    try {
      const update = await checkForUpdates();

      if (update) {
        setCheckStatus("update-available");
        setUpdateInfo(update);
        toast.success(
          t("versionInfo.updateAvailable", { version: update.version }) ||
            `Update available: ${update.version}`
        );
      } else {
        setCheckStatus("up-to-date");
        toast.success(t("versionInfo.upToDate") || "Your app is up to date!");
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      setCheckStatus("error");
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(t("versionInfo.checkError") || "Failed to check for updates");
    }
  };

  const handleInstallUpdate = async () => {
    if (!updateInfo || platform !== "desktop") {
      return;
    }

    setIsInstalling(true);
    setError("");

    try {
      await downloadAndInstallUpdate();

      // App will restart automatically after successful install
      toast.success(
        t("versionInfo.installSuccess") || "Update installed! Restarting..."
      );
    } catch (err) {
      console.error("Failed to install update:", err);
      setIsInstalling(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(t("versionInfo.installError") || "Failed to install update");
    }
  };

  // Hide on web platform
  if (platform !== "desktop") {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {t("versionInfo.title") || "Version Information"}
            </CardTitle>
            <CardDescription>
              {t("versionInfo.description") ||
                "Check for updates and view version details"}
            </CardDescription>
          </div>
          {checkStatus === "up-to-date" && (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Version */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">
            {t("versionInfo.currentVersion") || "Current Version"}
          </span>
          <Badge variant="outline" className="font-mono">
            v{currentVersion || "..."}
          </Badge>
        </div>

        {/* Update Status */}
        {checkStatus !== "idle" && (
          <div className="space-y-2">
            {checkStatus === "checking" && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  {t("versionInfo.checking") || "Checking for updates..."}
                </AlertDescription>
              </Alert>
            )}

            {checkStatus === "up-to-date" && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {t("versionInfo.upToDate") || "Your app is up to date!"}
                </AlertDescription>
              </Alert>
            )}

            {checkStatus === "update-available" && updateInfo && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <div className="space-y-2">
                    <p className="font-medium">
                      {t("versionInfo.updateAvailable", {
                        version: updateInfo.version,
                      }) || `Update available: v${updateInfo.version}`}
                    </p>
                    {updateInfo.body && (
                      <p className="text-xs opacity-80">{updateInfo.body}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {checkStatus === "error" && error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            onClick={handleCheckForUpdates}
            disabled={checkStatus === "checking" || isInstalling}
            variant="outline"
            className="flex-1"
          >
            {checkStatus === "checking" ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("versionInfo.checking") || "Checking..."}
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {t("versionInfo.checkButton") || "Check for Updates"}
              </>
            )}
          </Button>

          {checkStatus === "update-available" && updateInfo && (
            <Button
              onClick={handleInstallUpdate}
              disabled={isInstalling}
              className="flex-1"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("versionInfo.installing") || "Installing..."}
                </>
              ) : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  {t("versionInfo.installButton") || "Install Update"}
                </>
              )}
            </Button>
          )}
        </div>

        {/* Auto-update Info */}
        <p className="text-xs text-muted-foreground">
          {t("versionInfo.autoUpdateNote") ||
            "The app checks for updates automatically on startup. You can also check manually here."}
        </p>
      </CardContent>
    </Card>
  );
}
