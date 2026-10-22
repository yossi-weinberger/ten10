import type { ReactNode, RefObject } from "react";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useEffect, useState } from "react";

export const ASSISTANT_DESKTOP_SHELL: "dialog" | "sheet" = "dialog";

interface AssistantShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  headerActions?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  initialFocusRef: RefObject<HTMLTextAreaElement | null>;
}

function desktopShell(): "dialog" | "sheet" {
  if (typeof window === "undefined") return ASSISTANT_DESKTOP_SHELL;
  return new URLSearchParams(window.location.search).get("assistantShell") === "sheet"
    ? "sheet"
    : ASSISTANT_DESKTOP_SHELL;
}

function Frame({
  title,
  description,
  headerActions,
  reserveClose,
  children,
  footer,
}: {
  title: string;
  description: string;
  headerActions?: ReactNode;
  reserveClose: boolean;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className={cn("flex items-center gap-2 py-3 ps-4", reserveClose ? "pe-12" : "pe-4")}>
        <Sparkles className="size-4 shrink-0 text-primary" aria-hidden />
        <p className="min-w-0 flex-1 truncate text-base font-semibold">{title}</p>
        <p className="sr-only">{description}</p>
        <div className="flex shrink-0 items-center gap-1">{headerActions}</div>
      </div>
      <Separator />
      <div className="min-h-0 flex-1">{children}</div>
      <div className="border-t bg-background p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>
    </div>
  );
}

export function AssistantShell({
  open,
  onOpenChange,
  title,
  description,
  headerActions,
  children,
  footer,
  initialFocusRef,
}: AssistantShellProps) {
  const { i18n } = useTranslation();
  const isSmallNow = useMediaQuery("(max-width: 767px)");
  const [useDrawer, setUseDrawer] = useState(isSmallNow);
  const shell = desktopShell();

  useEffect(() => {
    if (open) return;
    const timeoutId = window.setTimeout(() => setUseDrawer(isSmallNow), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isSmallNow, open]);

  const frame = (reserveClose: boolean) => (
    <Frame
      title={title}
      description={description}
      headerActions={headerActions}
      reserveClose={reserveClose}
      footer={footer}
    >
      {children}
    </Frame>
  );

  if (useDrawer) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent dir={i18n.dir()} className="flex h-[92dvh] max-h-[92dvh] flex-col p-0">
          <DrawerTitle className="sr-only">{title}</DrawerTitle>
          <DrawerDescription className="sr-only">{description}</DrawerDescription>
          {frame(false)}
        </DrawerContent>
      </Drawer>
    );
  }

  if (shell === "sheet") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          dir={i18n.dir()}
          side={i18n.dir() === "rtl" ? "left" : "right"}
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetTitle className="sr-only">{title}</SheetTitle>
          <SheetDescription className="sr-only">{description}</SheetDescription>
          {frame(true)}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir={i18n.dir()}
        className="flex h-[min(85dvh,48rem)] max-w-2xl flex-col gap-0 p-0"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          initialFocusRef.current?.focus();
        }}
      >
        <DialogTitle className="sr-only">{title}</DialogTitle>
        <DialogDescription className="sr-only">{description}</DialogDescription>
        {frame(true)}
      </DialogContent>
    </Dialog>
  );
}
