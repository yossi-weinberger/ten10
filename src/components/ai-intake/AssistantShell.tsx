import type { HTMLAttributes, ReactNode, RefObject } from "react";
import { useDropzone } from "react-dropzone";
import { Receipt } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { AssistantMark } from "./AssistantMark";
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

interface AssistantShellProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  headerActions?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  onReceipt?: (file: File) => void;
  initialFocusRef: RefObject<HTMLTextAreaElement | null>;
}

function Frame({
  title,
  subtitle,
  description,
  headerActions,
  reserveClose,
  dropProps,
  dragging,
  dropLabel,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  description: string;
  headerActions?: ReactNode;
  reserveClose: boolean;
  dropProps: HTMLAttributes<HTMLDivElement>;
  dragging: boolean;
  dropLabel: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div {...dropProps} className={cn("relative flex h-full min-h-0 flex-1 flex-col", dropProps.className)}>
      {dragging ? (
        <div className="absolute inset-2 z-10 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/50 bg-background/90 text-sm">
          <Receipt className="size-5 text-primary" aria-hidden />
          {dropLabel}
        </div>
      ) : null}
      <div className={cn("flex items-center gap-2 py-3 ps-4", reserveClose ? "pe-12" : "pe-4")}>
        <AssistantMark size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-base font-semibold leading-tight">{title}</p>
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
        </div>
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
  onReceipt,
  initialFocusRef,
}: AssistantShellProps) {
  const { t, i18n } = useTranslation();
  const { getRootProps, isDragActive } = useDropzone({
    noClick: true,
    noKeyboard: true,
    multiple: false,
    disabled: !onReceipt,
    accept: {
      "image/jpeg": [],
      "image/png": [],
      "image/webp": [],
      "application/pdf": [],
    },
    onDropAccepted: (files) => {
      const file = files[0];
      if (file) onReceipt?.(file);
    },
  });
  // A phone in landscape is wide but short: it gets the full-height drawer too.
  const isSmallNow = useMediaQuery("(max-width: 767px), (max-height: 500px)");
  const [useDrawer, setUseDrawer] = useState(isSmallNow);

  useEffect(() => {
    if (open) return;
    const timeoutId = window.setTimeout(() => setUseDrawer(isSmallNow), 0);
    return () => window.clearTimeout(timeoutId);
  }, [isSmallNow, open]);

  const frame = (reserveClose: boolean) => (
    <Frame
      title={title}
      subtitle={t("aiIntake.subtitle", { ns: "navigation" })}
      description={description}
      headerActions={headerActions}
      reserveClose={reserveClose}
      dropProps={getRootProps({ className: "relative flex h-full min-h-0 flex-1 flex-col" })}
      dragging={isDragActive}
      dropLabel={t("aiIntake.dropReceipt", { ns: "navigation" })}
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

  // Desktop: a side panel opposite the menu (left in Hebrew). Not modal, so the site stays usable;
  // a click on the page keeps it open, and only X, Escape or a followed link closes it.
  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        dir={i18n.dir()}
        side={i18n.dir() === "rtl" ? "left" : "right"}
        className="flex w-full flex-col gap-0 p-0 shadow-2xl sm:max-w-md"
        onOpenAutoFocus={(event) => {
          event.preventDefault();
          initialFocusRef.current?.focus();
        }}
        onInteractOutside={(event) => event.preventDefault()}
      >
        <SheetTitle className="sr-only">{title}</SheetTitle>
        <SheetDescription className="sr-only">{description}</SheetDescription>
        {frame(true)}
      </SheetContent>
    </Sheet>
  );
}
