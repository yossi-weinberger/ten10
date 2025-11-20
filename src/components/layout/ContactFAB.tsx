import { MessageSquarePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { cn } from "@/lib/utils";

const ContactFAB = () => {
  const { t, i18n } = useTranslation();
  const { platform } = usePlatform();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDesktopChoiceOpen, setIsDesktopChoiceOpen] = useState(false);
  const [desktopInfo, setDesktopInfo] = useState({
    body: "",
    appVersion: "",
    osPlatform: "",
  });

  const prepareDesktopInfo = async () => {
    if (platform !== "desktop" || !isDesktopChoiceOpen) {
      return;
    }

    try {
      const clientInfo = await getDesktopClientInfo();

      const { os, osVersion, arch, appVersion } = clientInfo;

      const body = `\n\n---\nApp Version: ${appVersion}\nOS: ${os}\nOS Version: ${osVersion}\nArchitecture: ${arch}\nLanguage: ${
        i18n.language
      }\nDate: ${new Date().toISOString()}`;

      setDesktopInfo({ body, appVersion, osPlatform: os });
    } catch (error) {
      console.error("Failed to get platform info:", error);
    }
  };

  useEffect(() => {
    // Only run when dialog is open and platform is desktop
    if (platform === "desktop" && isDesktopChoiceOpen) {
      prepareDesktopInfo();
    }
  }, [isDesktopChoiceOpen, platform]);

  const copyToClipboard = async (text: string, type: string) => {
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      await invoke("copy_to_clipboard", { text });
      toast.success(t(`contact:desktop.copySuccess.${type}`));
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
      toast.error("Failed to copy.");
    }
  };

  const handleClick = () => {
    if (platform === "loading") {
      return; // Early return if platform is still loading
    }
    if (platform === "web") {
      setIsModalOpen(true);
    } else if (platform === "desktop") {
      setIsDesktopChoiceOpen(true);
    }
  };

  if (platform === "loading") {
    return null;
  }

  return (
    <>
      <div
        className={cn(
          "fixed bottom-6 z-50",
          i18n.dir() === "rtl" ? "left-6" : "right-6"
        )}
      >
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              className="rounded-full w-14 h-14 shadow-lg"
              onClick={handleClick}
              aria-label={t("contact:fabTooltip")}
            >
              <MessageSquarePlus className="w-6 h-6" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{t("contact:fabTooltip")}</p>
          </TooltipContent>
        </Tooltip>
      </div>

      {platform === "web" && (
        <ContactModal isOpen={isModalOpen} onOpenChange={setIsModalOpen} />
      )}

      {platform === "desktop" && (
        <Dialog
          open={isDesktopChoiceOpen}
          onOpenChange={setIsDesktopChoiceOpen}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("contact:desktop.title")}</DialogTitle>
              <DialogDescription>
                {t("contact:desktop.description")}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 pt-2">
              <div>
                <h3 className="font-semibold text-lg flex items-center">
                  <Mail className="mr-2 h-5 w-5" />
                  {t("contact:modal.tabs.rabbi")}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("contact:desktop.rabbiInstruction")}
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
                  {t("contact:modal.tabs.dev")}
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  {t("contact:desktop.devInstruction")}
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
                  {t("contact:desktop.includeInfo")}
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
                  {t("contact:desktop.copyInfoButton")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ContactFAB;
