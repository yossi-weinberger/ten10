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

interface OnboardingSuccessDialogProps {
  open: boolean;
  onDismiss: () => void;
}

export function OnboardingSuccessDialog({
  open,
  onDismiss,
}: OnboardingSuccessDialogProps) {
  const { t } = useTranslation("onboarding");
  const useDesktop = useMediaQuery("(min-width: 768px)");

  if (useDesktop) {
    return (
      <Dialog open={open} onOpenChange={(next) => !next && onDismiss()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("success.title")}</DialogTitle>
            <DialogDescription>{t("success.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" onClick={onDismiss}>
              {t("success.dismiss")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={open} onOpenChange={(next) => !next && onDismiss()}>
      <DrawerContent>
        <DrawerHeader className="text-start">
          <DrawerTitle>{t("success.title")}</DrawerTitle>
          <DrawerDescription>{t("success.description")}</DrawerDescription>
        </DrawerHeader>
        <DrawerFooter>
          <Button type="button" onClick={onDismiss}>
            {t("success.dismiss")}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
