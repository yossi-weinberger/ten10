import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { usePlatform } from "@/contexts/PlatformContext";
import { useState, useEffect } from "react";
import { ContactModal } from "@/components/features/contact";
// Tauri APIs will be called via a command, not imported directly
// import { getVersion } from '@tauri-apps/api/app'
// import { platform as getOsPlatform } from '@tauri-apps/api/os'
import { getDesktopClientInfo } from "@/lib/data-layer/contact.service";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Mail, Bug, ClipboardCopy } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Textarea } from "../ui/textarea";

/**
 * "Contact", opened from the side menu: the contact form on the web, the copy-email dialog in the desktop app.
 */
export function ContactDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation("contact");
  const { platform } = usePlatform();
  const isDesktopChoiceOpen = platform === "desktop" && open;
  const [desktopInfo, setDesktopInfo] = useState({ body: "" });

  // The app details for a bug report, read when the desktop dialog opens.
  useEffect(() => {
    if (!isDesktopChoiceOpen) return;
    let cancelled = false;
    getDesktopClientInfo()
      .then(({ os, osVersion, arch, appVersion }) => {
        if (cancelled) return;
        const body = `\n\nApp Version: ${appVersion}\nOS: ${os}\nOS Version: ${osVersion}\nArchitecture: ${arch}\nLanguage: ${
          i18n.language
        }\nDate: ${new Date().toISOString()}`;
        setDesktopInfo({ body });
      })
      .catch((error) => console.error("Failed to get platform info:", error));
    return () => {
      cancelled = true;
    };
  }, [isDesktopChoiceOpen, i18n.language]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("copy_to_clipboard", { text });
      toast.success(t(`desktop.copySuccess.${type}`));
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error(t("desktop.copyError"));
    }
  };

  if (platform === "loading") {
    return null;
  }

  return (
    <>
      {platform === "web" && (
        <ContactModal isOpen={open} onOpenChange={onOpenChange} />
      )}

      {platform === "desktop" && (
        <Dialog
          open={open}
          onOpenChange={onOpenChange}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("desktop.title")}</DialogTitle>
              <DialogDescription>
                {t("desktop.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-2">
              <div>
                <h3 className="font-semibold text-lg flex items-center">
                  <Mail className="mr-2 h-5 w-5" />
                  {t("modal.tabs.rabbi")}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("desktop.rabbiInstruction")}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Input readOnly value="halacha@ten10-app.com" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyToClipboard("halacha@ten10-app.com", "email")
                    }
                  >
                    <ClipboardCopy className="h-5 w-5" />
                  </Button>
                </div>
              </div>
              <div className="border-t pt-6">
                <h3 className="font-semibold text-lg flex items-center">
                  <Bug className="mr-2 h-5 w-5" />
                  {t("modal.tabs.dev")}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("desktop.devInstruction")}
                </p>
                <div className="flex items-center space-x-2 mt-2">
                  <Input readOnly value="dev@ten10-app.com" />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      copyToClipboard("dev@ten10-app.com", "email")
                    }
                  >
                    <ClipboardCopy className="h-5 w-5" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground mt-4 font-medium">
                  {t("desktop.includeInfo")}
                </p>
                <Textarea
                  readOnly
                  value={desktopInfo.body.trim()}
                  className="mt-1 h-28"
                />
                <Button
                  variant="outline"
                  className="mt-2 w-full"
                  onClick={() => copyToClipboard(desktopInfo.body, "info")}
                >
                  <ClipboardCopy className="mr-2 h-4 w-4" />
                  {t("desktop.copyInfoButton")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
