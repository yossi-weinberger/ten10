import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import {
  checkForUpdates,
  downloadAndInstallUpdate,
} from "@/lib/data-layer/updater.service";
import { logger } from "@/lib/logger";
import type { Platform } from "@/contexts/PlatformContext";

const FORCE_UPDATE_TOAST_KEY = "ten10:forceUpdateToast";

/**
 * After the desktop shell (and Toaster) is mounted, check for updates and
 * show a top-center toast with an install action when one is available.
 *
 * DEV: localStorage.setItem("ten10:forceUpdateToast", "9.9.9") then reload.
 */
export function useDesktopUpdateCheck(
  platform: Platform,
  desktopInitComplete: boolean
) {
  const { i18n, t } = useTranslation();
  const tRef = useRef(t);
  tRef.current = t;

  useEffect(() => {
    if (platform !== "desktop" || !desktopInitComplete) return;

    let cancelled = false;

    void (async () => {
      try {
        const forcedVersion = import.meta.env.DEV
          ? localStorage.getItem(FORCE_UPDATE_TOAST_KEY)
          : null;

        const updateInfo = forcedVersion
          ? { version: forcedVersion, date: new Date().toISOString() }
          : await checkForUpdates();

        if (cancelled) return;
        if (!updateInfo) {
          logger.log("App is up to date");
          return;
        }

        logger.log(`Update available: ${updateInfo.version}`);
        await i18n.loadNamespaces("settings");
        if (cancelled) return;

        toast.info(
          tRef.current("versionInfo.updateAvailable", {
            version: updateInfo.version,
            ns: "settings",
          }),
          {
            duration: 15000,
            position: "top-center",
            action: {
              label: tRef.current("versionInfo.installButton", {
                ns: "settings",
              }),
              onClick: () => {
                const toastId = toast.loading(
                  tRef.current("versionInfo.downloading", { ns: "settings" })
                );
                void downloadAndInstallUpdate()
                  .then(() => {
                    toast.success(
                      tRef.current("versionInfo.installSuccess", {
                        ns: "settings",
                      }),
                      { id: toastId }
                    );
                  })
                  .catch((error) => {
                    logger.error("Failed to install update from toast:", error);
                    toast.error(
                      tRef.current("versionInfo.installError", {
                        ns: "settings",
                      }),
                      { id: toastId }
                    );
                  });
              },
            },
          }
        );
      } catch (error) {
        logger.error("Failed to check for updates:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [platform, desktopInitComplete, i18n]);
}
