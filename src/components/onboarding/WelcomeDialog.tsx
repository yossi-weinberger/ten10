import { useEffect, useState } from "react";
import { CircleHelp } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ArrivalCodeField } from "@/components/attribution/ArrivalCodeField";
import { readFirstTouch } from "@/lib/attribution/capture";
import {
  persistDesktopArrivalCode,
  readDesktopArrivalCode,
} from "@/lib/attribution/desktop";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

interface WelcomeDialogProps {
  open: boolean;
  pending: boolean;
  showArrivalCode?: boolean;
  onStart: () => void;
  onSkip: () => void;
}

export function WelcomeDialog({
  open,
  pending,
  showArrivalCode = false,
  onStart,
  onSkip,
}: WelcomeDialogProps) {
  const { t } = useTranslation("onboarding");
  const useDesktop = useMediaQuery("(min-width: 768px)");
  const [arrivalCode, setArrivalCode] = useState("");

  useEffect(() => {
    if (!open || !showArrivalCode) return;
    let cancelled = false;
    void (async () => {
      const stored = await readDesktopArrivalCode();
      const fallback = readFirstTouch()?.code ?? "";
      if (!cancelled) setArrivalCode(stored ?? fallback);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, showArrivalCode]);

  const commitArrivalCode = () => {
    if (showArrivalCode) {
      void persistDesktopArrivalCode(arrivalCode);
    }
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !pending) {
      commitArrivalCode();
      onSkip();
    }
  };

  const arrivalCodeField = showArrivalCode ? (
    <ArrivalCodeField
      namespace="onboarding"
      value={arrivalCode}
      onChange={setArrivalCode}
      disabled={pending}
    />
  ) : null;

  const description = (
    <>
      {t("welcome.description")}
      <br />
      {t("welcome.restartBefore")}
      <CircleHelp
        className="mb-0.5 inline h-4 w-4 text-muted-foreground"
        aria-hidden="true"
      />
      {t("welcome.restartAfter")}
    </>
  );

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() => {
          commitArrivalCode();
          onSkip();
        }}
      >
        {t("welcome.skip")}
      </Button>
      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={() => {
          commitArrivalCode();
          onStart();
        }}
      >
        {t("welcome.start")}
      </Button>
    </>
  );

  if (useDesktop) {
    return (
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("welcome.title")}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          {arrivalCodeField}
          <DialogFooter className="sm:justify-end">{actions}</DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-start">
          <DrawerTitle>{t("welcome.title")}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        {arrivalCodeField ? (
          <div className="px-4">{arrivalCodeField}</div>
        ) : null}
        <DrawerFooter>{actions}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
