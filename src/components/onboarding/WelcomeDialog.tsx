import { useTranslation } from "react-i18next";
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
  onStart: () => void;
  onSkip: () => void;
}

export function WelcomeDialog({
  open,
  pending,
  onStart,
  onSkip,
}: WelcomeDialogProps) {
  const { t } = useTranslation("onboarding");
  const useDesktop = useMediaQuery("(min-width: 768px)");

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && !pending) {
      onSkip();
    }
  };

  const actions = (
    <>
      <Button
        type="button"
        variant="outline"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={onSkip}
      >
        {t("welcome.skip")}
      </Button>
      <Button
        type="button"
        className="w-full sm:w-auto"
        disabled={pending}
        onClick={onStart}
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
            <DialogDescription>{t("welcome.description")}</DialogDescription>
          </DialogHeader>
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
          <DrawerDescription>{t("welcome.description")}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>{actions}</DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
