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
  Sparkles,
} from "lucide-react";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  getCurrentVersion,
  checkForUpdates,
  downloadAndInstallUpdate,
  type UpdateInfo,
} from "@/lib/data-layer/updater.service";
import toast from "react-hot-toast";
import { WhatsNewModal } from "@/components/WhatsNewModal";

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
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(false);

  // Load version on mount
  useEffect(() => {
    getCurrentVersion()
      .then(setCurrentVersion)
      .catch((err) => {
        console.error("Failed to get version:", err);
        setCurrentVersion("Unknown");
      });
  }, [platform]);

  const handleCheckForUpdates = async () => {
    if (platform !== "desktop") {
      return;
    }

    setCheckStatus("checking");
    setError("");
    setUpdateInfo(null);
    setIsNetworkError(false);

    try {
      const update = await checkForUpdates();

      if (update) {
        setCheckStatus("update-available");
        setUpdateInfo(update);
        toast.success(
          t("versionInfo.updateAvailable", { version: update.version }),
        );
      } else {
        setCheckStatus("up-to-date");
        toast.success(t("versionInfo.upToDate"));
      }
    } catch (err) {
      console.error("Failed to check for updates:", err);
      setCheckStatus("error");

      // Check if it's a network error (robust detection)
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      const isNetwork =
        err instanceof TypeError || // Network/fetch errors are typically TypeError
        (typeof err === "object" &&
          err !== null &&
          "code" in err &&
          ["ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT"].includes(
            (err as any).code,
          )) ||
        errorMessage.toLowerCase().includes("could not fetch");

      setIsNetworkError(isNetwork);

      if (isNetwork) {
        setError(t("versionInfo.networkError"));
      } else {
        setError(errorMessage);
      }

      toast.error(
        isNetwork ? t("versionInfo.networkError") : t("versionInfo.checkError"),
      );
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
      toast.success(t("versionInfo.installSuccess"));
    } catch (err) {
      console.error("Failed to install update:", err);
      setIsInstalling(false);
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      setError(errorMessage);
      toast.error(t("versionInfo.installError"));
    }
  };

  // On web, show version only (no update functionality)
  const isWeb = platform === "web";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {t("versionInfo.title")}
            </CardTitle>
            <CardDescription>{t("versionInfo.description")}</CardDescription>
          </div>
          {checkStatus === "up-to-date" && (
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Current Version */}
        <div className="grid grid-cols-3 items-center gap-3">
          <span className="text-sm font-medium">
            {t("versionInfo.currentVersion")}
          </span>
          <div className="flex justify-center">
            <Badge variant="outline" className="font-mono text-base px-2 py-1">
              v{currentVersion || "..."}
            </Badge>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => setShowWhatsNew(true)}
              variant="outline"
              size="sm"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {t("versionInfo.whatsNewButton")}
            </Button>
          </div>
        </div>

        {/* Update Status */}
        {checkStatus !== "idle" && (
          <div className="space-y-2">
            {checkStatus === "checking" && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>{t("versionInfo.checking")}</AlertDescription>
              </Alert>
            )}

            {checkStatus === "up-to-date" && (
              <Alert className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950">
                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                <AlertDescription className="text-green-800 dark:text-green-200">
                  {t("versionInfo.upToDate")}
                </AlertDescription>
              </Alert>
            )}

            {checkStatus === "update-available" && updateInfo && (
              <Alert className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950">
                <Download className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertDescription className="text-blue-800 dark:text-blue-200">
                  <p className="font-medium">
                    {t("versionInfo.updateAvailable", {
                      version: updateInfo.version,
                    })}
                  </p>
                </AlertDescription>
              </Alert>
            )}

            {checkStatus === "error" && error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <p>{error}</p>
                    {isNetworkError && (
                      <p className="text-xs">{t("versionInfo.offlineHelp")}</p>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Action Buttons - Desktop Only */}
        {!isWeb && (
          <>
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
                    {t("versionInfo.checking")}
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("versionInfo.checkButton")}
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
                      {t("versionInfo.installing")}
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      {t("versionInfo.installButton")}
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* Auto-update Info - Desktop Only */}
            <p className="text-xs text-muted-foreground">
              {t("versionInfo.autoUpdateNote")}
            </p>
          </>
        )}

        {/* Web Version Info */}
        {isWeb && (
          <p className="text-xs text-muted-foreground">
            {t("versionInfo.webVersionNote")}
          </p>
        )}
      </CardContent>
      <WhatsNewModal open={showWhatsNew} onOpenChange={setShowWhatsNew} />
    </Card>
  );
}
