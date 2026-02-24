"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";

import { cn } from "@/lib/utils";

const TooltipProvider = TooltipPrimitive.Provider;

type TooltipRootProps = React.ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Root
>;
type TooltipTriggerProps = React.ComponentPropsWithoutRef<
  typeof TooltipPrimitive.Trigger
>;

type TooltipInteractionContextValue = {
  isTouchLikeDevice: boolean;
  toggle: () => void;
};

const TooltipInteractionContext =
  React.createContext<TooltipInteractionContextValue | null>(null);

function useIsTouchLikeDevice() {
  const [isTouchLikeDevice, setIsTouchLikeDevice] = React.useState(false);

  React.useEffect(() => {
    const hoverNoneMediaQuery = window.matchMedia("(hover: none)");
    const coarsePointerMediaQuery = window.matchMedia("(pointer: coarse)");

    const updateTouchLikeState = () => {
      setIsTouchLikeDevice(
        hoverNoneMediaQuery.matches || coarsePointerMediaQuery.matches,
      );
    };

    updateTouchLikeState();

    hoverNoneMediaQuery.addEventListener("change", updateTouchLikeState);
    coarsePointerMediaQuery.addEventListener("change", updateTouchLikeState);

    return () => {
      hoverNoneMediaQuery.removeEventListener("change", updateTouchLikeState);
      coarsePointerMediaQuery.removeEventListener(
        "change",
        updateTouchLikeState,
      );
    };
  }, []);

  return isTouchLikeDevice;
}

const Tooltip = ({
  children,
  open: openProp,
  defaultOpen,
  onOpenChange,
  ...props
}: TooltipRootProps) => {
  const isTouchLikeDevice = useIsTouchLikeDevice();
  const isControlled = typeof openProp === "boolean";
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false,
  );
  const resolvedOpen = isControlled ? openProp : uncontrolledOpen;

  const handleTouchOpenChange = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange],
  );

  const toggleTouchTooltip = React.useCallback(() => {
    if (!isTouchLikeDevice) return;
    handleTouchOpenChange(!resolvedOpen);
  }, [isTouchLikeDevice, handleTouchOpenChange, resolvedOpen]);

  const interactionContextValue = React.useMemo(
    () => ({
      isTouchLikeDevice,
      toggle: toggleTouchTooltip,
    }),
    [isTouchLikeDevice, toggleTouchTooltip],
  );

  const rootProps: TooltipRootProps = isTouchLikeDevice
    ? {
        ...props,
        open: resolvedOpen,
        onOpenChange: handleTouchOpenChange,
      }
    : isControlled
      ? {
          ...props,
          open: openProp,
          onOpenChange,
        }
      : {
          ...props,
          defaultOpen,
          onOpenChange,
        };

  return (
    <TooltipInteractionContext.Provider value={interactionContextValue}>
      <TooltipPrimitive.Root {...rootProps}>{children}</TooltipPrimitive.Root>
    </TooltipInteractionContext.Provider>
  );
};
Tooltip.displayName = "Tooltip";

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  TooltipTriggerProps
>(({ onClick, ...props }, ref) => {
  const interactionContext = React.useContext(TooltipInteractionContext);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    if (interactionContext?.isTouchLikeDevice) {
      interactionContext.toggle();
    }
  };

  return (
    <TooltipPrimitive.Trigger ref={ref} {...props} onClick={handleClick} />
  );
});
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-[99999] overflow-hidden rounded-md border bg-dialog-fallback bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    />
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
